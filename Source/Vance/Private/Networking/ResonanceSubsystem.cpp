#include "Networking/ResonanceSubsystem.h"

#include "AbilitySystemBlueprintLibrary.h"
#include "AbilitySystemComponent.h"
#include "Engine/World.h"

bool UResonanceSubsystem::DoesSupportWorldType(const EWorldType::Type WorldType) const
{
	return WorldType == EWorldType::Game || WorldType == EWorldType::PIE;
}

TStatId UResonanceSubsystem::GetStatId() const
{
	RETURN_QUICK_DECLARE_CYCLE_STAT(UResonanceSubsystem, STATGROUP_Tickables);
}

void UResonanceSubsystem::RegisterField(const FResonanceField& Field)
{
	if (GetWorld()->GetNetMode() == NM_Client)
	{
		return;
	}

	LiveFields.Add(Field);
}

void UResonanceSubsystem::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);

	if (LiveFields.Num() > 1)
	{
		ResolvePairings();
	}

	const uint64 CurrentFrame = GFrameCounter;
	LiveFields.RemoveAllSwap([this, CurrentFrame](const FResonanceField& Field)
	{
		return !Field.Instigator.IsValid()
			|| CurrentFrame - Field.ServerFrame > static_cast<uint64>(ResonanceWindowFrames);
	});
}

void UResonanceSubsystem::ResolvePairings()
{
	TSet<int32> Consumed;

	for (int32 A = 0; A < LiveFields.Num(); ++A)
	{
		if (Consumed.Contains(A))
		{
			continue;
		}

		for (int32 B = A + 1; B < LiveFields.Num(); ++B)
		{
			if (Consumed.Contains(B))
			{
				continue;
			}

			const FResonanceField& FieldA = LiveFields[A];
			const FResonanceField& FieldB = LiveFields[B];

			if (FieldA.Instigator == FieldB.Instigator)
			{
				continue;
			}

			const float CenterDistance = FVector::Dist(FieldA.Origin, FieldB.Origin);
			if (CenterDistance > FieldA.Radius + FieldB.Radius)
			{
				continue;
			}

			FResonanceRecipe Recipe;
			if (!FindRecipe(FieldA.Tags, FieldB.Tags, Recipe))
			{
				continue;
			}

			SpawnResonance(FieldA, FieldB, Recipe);
			Consumed.Add(A);
			Consumed.Add(B);
			break;
		}
	}
}

bool UResonanceSubsystem::FindRecipe(
	const FGameplayTagContainer& TagsA,
	const FGameplayTagContainer& TagsB,
	FResonanceRecipe& OutRecipe) const
{
	for (const FResonanceRecipe& Recipe : Recipes)
	{
		const bool bForward = TagsA.HasTag(Recipe.TagA) && TagsB.HasTag(Recipe.TagB);
		const bool bReverse = TagsA.HasTag(Recipe.TagB) && TagsB.HasTag(Recipe.TagA);

		if (bForward || bReverse)
		{
			OutRecipe = Recipe;
			return true;
		}
	}

	return false;
}

void UResonanceSubsystem::SpawnResonance(
	const FResonanceField& FieldA,
	const FResonanceField& FieldB,
	const FResonanceRecipe& Recipe)
{
	UAbilitySystemComponent* SourceASC =
		UAbilitySystemBlueprintLibrary::GetAbilitySystemComponent(FieldA.Instigator.Get());
	if (!SourceASC || !Recipe.CombinedEffectClass)
	{
		return;
	}

	const FVector Midpoint = (FieldA.Origin + FieldB.Origin) * 0.5f;
	const float Radius = FMath::Max(FieldA.Radius, FieldB.Radius) * Recipe.ResultRadiusScale;

	FGameplayEffectContextHandle Context = SourceASC->MakeEffectContext();
	Context.AddInstigator(FieldA.Instigator.Get(), FieldB.Instigator.Get());
	Context.AddOrigin(Midpoint);

	FGameplayEffectSpecHandle Spec =
		SourceASC->MakeOutgoingSpec(Recipe.CombinedEffectClass, 1.0f, Context);
	if (!Spec.IsValid())
	{
		return;
	}

	Spec.Data->DynamicGrantedTags.AddTag(Recipe.ResultTag);
	Spec.Data->SetSetByCallerMagnitude(Recipe.ResultTag, Radius);

	TArray<FOverlapResult> Overlaps;
	GetWorld()->OverlapMultiByChannel(
		Overlaps,
		Midpoint,
		FQuat::Identity,
		ECC_Pawn,
		FCollisionShape::MakeSphere(Radius));

	for (const FOverlapResult& Overlap : Overlaps)
	{
		if (UAbilitySystemComponent* TargetASC =
			UAbilitySystemBlueprintLibrary::GetAbilitySystemComponent(Overlap.GetActor()))
		{
			SourceASC->ApplyGameplayEffectSpecToTarget(*Spec.Data.Get(), TargetASC);
		}
	}
}
