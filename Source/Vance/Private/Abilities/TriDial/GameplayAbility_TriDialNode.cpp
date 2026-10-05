#include "Abilities/TriDial/GameplayAbility_TriDialNode.h"

#include "AbilitySystemComponent.h"
#include "Abilities/TriDial/CatalystDataAsset.h"
#include "Abilities/TriDial/CoreActionDataAsset.h"
#include "Abilities/TriDial/VectorDataAsset.h"
#include "Environment/VanceGameplayTags.h"
#include "Field/FieldSystemActor.h"
#include "GeometryCollection/GeometryCollectionComponent.h"
#include "Networking/ResonanceFieldComponent.h"

UGameplayAbility_TriDialNode::UGameplayAbility_TriDialNode()
{
	InstancingPolicy = EGameplayAbilityInstancingPolicy::InstancedPerActor;
	NetExecutionPolicy = EGameplayAbilityNetExecutionPolicy::LocalPredicted;
	ReplicationPolicy = EGameplayAbilityReplicationPolicy::ReplicateNo;
}

bool UGameplayAbility_TriDialNode::SetDial(ETriDialSlot Slot, const UPrimaryDataAsset* DialAsset)
{
	switch (Slot)
	{
	case ETriDialSlot::Core:
		CoreDial = Cast<UCoreActionDataAsset>(DialAsset);
		break;
	case ETriDialSlot::Catalyst:
		CatalystDial = Cast<UCatalystDataAsset>(DialAsset);
		break;
	case ETriDialSlot::Vector:
		VectorDial = Cast<UVectorDataAsset>(DialAsset);
		break;
	}

	FGameplayTag BlockingTag;
	if (!IsCombinationLegal(BlockingTag))
	{
		return false;
	}

	ResolveNode();

	if (const FGameplayAbilityActorInfo* ActorInfo = GetCurrentActorInfo();
		ActorInfo && !ActorInfo->IsNetAuthority())
	{
		ServerSetDialLoadout(FTriDialLoadout{ CoreDial, CatalystDial, VectorDial });
	}

	return true;
}

bool UGameplayAbility_TriDialNode::IsCombinationLegal(FGameplayTag& OutBlockingTag) const
{
	if (!CoreDial || !VectorDial)
	{
		return false;
	}

	FGameplayTagContainer Present;
	Present.AddTag(CoreDial->CoreTag);
	Present.AddTag(VectorDial->VectorTag);
	if (CatalystDial)
	{
		Present.AddTag(CatalystDial->CatalystTag);
		Present.AddTag(CatalystDial->ElementTag);
	}

	auto FirstConflict = [&Present, &OutBlockingTag](const FGameplayTagContainer& Incompatible)
	{
		for (const FGameplayTag& Tag : Incompatible)
		{
			if (Present.HasTag(Tag))
			{
				OutBlockingTag = Tag;
				return true;
			}
		}
		return false;
	};

	return !FirstConflict(CoreDial->IncompatibleTags)
		&& !FirstConflict(VectorDial->IncompatibleTags)
		&& !(CatalystDial && FirstConflict(CatalystDial->IncompatibleTags));
}

void UGameplayAbility_TriDialNode::ResolveNode()
{
	ResolvedNode = FTriDialResolvedNode();

	if (!CoreDial || !VectorDial)
	{
		return;
	}

	ResolvedNode.Modifiers = CoreDial->BaseModifiers;
	ResolvedNode.CompositeTags.AddTag(CoreDial->CoreTag);
	ResolvedNode.CompositeTags.AppendTags(CoreDial->GrantedStateTags);

	if (CatalystDial)
	{
		ResolvedNode.Modifiers.Combine(CatalystDial->Modifiers);
		ResolvedNode.CompositeTags.AddTag(CatalystDial->CatalystTag);
		ResolvedNode.CompositeTags.AddTag(CatalystDial->ElementTag);
		ResolvedNode.CompositeTags.AppendTags(CatalystDial->AppliedStateTags);
	}

	ResolvedNode.Modifiers.Combine(VectorDial->Modifiers);
	ResolvedNode.CompositeTags.AddTag(VectorDial->VectorTag);

	ResolvedNode.Delivery = VectorDial->Delivery;
	ResolvedNode.EffectiveRadius = VectorDial->BaseRadius * ResolvedNode.Modifiers.RadiusMultiplier;
	ResolvedNode.EffectiveCost = CoreDial->BaseCost.GetValueAtLevel(GetAbilityLevel())
		* ResolvedNode.Modifiers.CostMultiplier;
}

bool UGameplayAbility_TriDialNode::CanActivateAbility(
	const FGameplayAbilitySpecHandle Handle,
	const FGameplayAbilityActorInfo* ActorInfo,
	const FGameplayTagContainer* SourceTags,
	const FGameplayTagContainer* TargetTags,
	OUT FGameplayTagContainer* OptionalRelevantTags) const
{
	FGameplayTag BlockingTag;
	if (!IsCombinationLegal(BlockingTag))
	{
		if (OptionalRelevantTags && BlockingTag.IsValid())
		{
			OptionalRelevantTags->AddTag(BlockingTag);
		}
		return false;
	}

	return Super::CanActivateAbility(Handle, ActorInfo, SourceTags, TargetTags, OptionalRelevantTags);
}

void UGameplayAbility_TriDialNode::ActivateAbility(
	const FGameplayAbilitySpecHandle Handle,
	const FGameplayAbilityActorInfo* ActorInfo,
	const FGameplayAbilityActivationInfo ActivationInfo,
	const FGameplayEventData* TriggerEventData)
{
	if (!CommitAbility(Handle, ActorInfo, ActivationInfo))
	{
		EndAbility(Handle, ActorInfo, ActivationInfo, true, true);
		return;
	}

	if (!ResolvedNode.IsValid())
	{
		ResolveNode();
	}

	// Targeting runs through the Vector's target actor; the payload is composed in OnTargetDataReady
	// so that catalyst reactions can read the state tags the target actually carries at impact.
}

FGameplayEffectSpecHandle UGameplayAbility_TriDialNode::BuildPayloadSpec(
	const FGameplayAbilityActorInfo* ActorInfo) const
{
	FGameplayEffectSpecHandle Spec = MakeOutgoingGameplayEffectSpec(
		CoreDial->PayloadEffectClass, GetAbilityLevel());

	if (!Spec.IsValid())
	{
		return Spec;
	}

	for (const FTriDialMagnitude& Magnitude : CoreDial->BaseMagnitudes)
	{
		const float Scaled = Magnitude.Value.GetValueAtLevel(GetAbilityLevel())
			* ResolvedNode.Modifiers.PotencyMultiplier;
		Spec.Data->SetSetByCallerMagnitude(Magnitude.DataTag, Scaled);
	}

	Spec.Data->SetSetByCallerMagnitude(
		VanceTags::Data_Duration, ResolvedNode.Modifiers.DurationMultiplier);
	Spec.Data->SetSetByCallerMagnitude(
		VanceTags::Data_Radius, ResolvedNode.EffectiveRadius);

	Spec.Data->DynamicGrantedTags.AppendTags(ResolvedNode.CompositeTags);

	return Spec;
}

void UGameplayAbility_TriDialNode::ApplyCatalystReactions(
	const FGameplayAbilityTargetDataHandle& TargetData,
	FGameplayEffectSpecHandle& PayloadSpec) const
{
	if (!CatalystDial || !PayloadSpec.IsValid())
	{
		return;
	}

	for (int32 Index = 0; Index < TargetData.Num(); ++Index)
	{
		const AActor* TargetActor = TargetData.Get(Index)->GetHitResult()
			? TargetData.Get(Index)->GetHitResult()->GetActor()
			: nullptr;

		const UAbilitySystemComponent* TargetASC =
			UAbilitySystemGlobals::GetAbilitySystemComponentFromActor(TargetActor);
		if (!TargetASC)
		{
			continue;
		}

		FGameplayTagContainer TargetTags;
		TargetASC->GetOwnedGameplayTags(TargetTags);

		for (const FCatalystReaction& Reaction : CatalystDial->Reactions)
		{
			if (!TargetTags.HasAll(Reaction.RequiredTargetTags))
			{
				continue;
			}

			PayloadSpec.Data->SetSetByCallerMagnitude(
				VanceTags::Data_ReactionPotency, Reaction.ReactionModifiers.PotencyMultiplier);

			if (Reaction.ResonanceTag.IsValid())
			{
				PayloadSpec.Data->DynamicGrantedTags.AddTag(Reaction.ResonanceTag);
			}
		}
	}
}

void UGameplayAbility_TriDialNode::ApplyStructuralStrain(
	const FGameplayAbilityTargetDataHandle& TargetData) const
{
	const float ThresholdScale = ResolvedNode.Modifiers.StrainThresholdMultiplier;
	if (FMath::IsNearlyEqual(ThresholdScale, 1.0f) || !VectorDial->ImpactFieldClass)
	{
		return;
	}

	for (int32 Index = 0; Index < TargetData.Num(); ++Index)
	{
		const FHitResult* Hit = TargetData.Get(Index)->GetHitResult();
		if (!Hit)
		{
			continue;
		}

		UGeometryCollectionComponent* Geometry =
			Cast<UGeometryCollectionComponent>(Hit->GetComponent());
		if (!Geometry)
		{
			continue;
		}

		Geometry->SetDamageThreshold({ Geometry->DamageThreshold[0] * ThresholdScale });
	}
}

void UGameplayAbility_TriDialNode::OnTargetDataReady(const FGameplayAbilityTargetDataHandle& TargetData)
{
	const FGameplayAbilityActorInfo* ActorInfo = GetCurrentActorInfo();
	FGameplayEffectSpecHandle PayloadSpec = BuildPayloadSpec(ActorInfo);

	ApplyCatalystReactions(TargetData, PayloadSpec);
	ApplyGameplayEffectSpecToTarget(
		GetCurrentAbilitySpecHandle(), ActorInfo, GetCurrentActivationInfo(), PayloadSpec, TargetData);

	if (ActorInfo->IsNetAuthority())
	{
		ApplyStructuralStrain(TargetData);

		if (VectorDial->bEmitsResonanceField && TargetData.Num() > 0)
		{
			EmitResonanceField(TargetData.Get(0)->GetEndPoint());
		}
	}

	EndAbility(GetCurrentAbilitySpecHandle(), ActorInfo, GetCurrentActivationInfo(), true, false);
}

void UGameplayAbility_TriDialNode::EmitResonanceField(const FVector& Origin) const
{
	if (!CachedResonanceComponent)
	{
		return;
	}

	CachedResonanceComponent->PublishField(
		Origin, ResolvedNode.EffectiveRadius, ResolvedNode.CompositeTags);
}

void UGameplayAbility_TriDialNode::EndAbility(
	const FGameplayAbilitySpecHandle Handle,
	const FGameplayAbilityActorInfo* ActorInfo,
	const FGameplayAbilityActivationInfo ActivationInfo,
	bool bReplicateEndAbility,
	bool bWasCancelled)
{
	Super::EndAbility(Handle, ActorInfo, ActivationInfo, bReplicateEndAbility, bWasCancelled);
}

bool UGameplayAbility_TriDialNode::ServerSetDialLoadout_Validate(FTriDialLoadout Loadout)
{
	return Loadout.Core != nullptr && Loadout.Vector != nullptr;
}

void UGameplayAbility_TriDialNode::ServerSetDialLoadout_Implementation(FTriDialLoadout Loadout)
{
	CoreDial = Loadout.Core;
	CatalystDial = Loadout.Catalyst;
	VectorDial = Loadout.Vector;

	FGameplayTag BlockingTag;
	if (!IsCombinationLegal(BlockingTag))
	{
		CoreDial = nullptr;
		CatalystDial = nullptr;
		VectorDial = nullptr;
		return;
	}

	ResolveNode();
}
