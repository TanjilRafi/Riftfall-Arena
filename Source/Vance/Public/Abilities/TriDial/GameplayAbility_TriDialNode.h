#pragma once

#include "CoreMinimal.h"
#include "Abilities/GameplayAbility.h"
#include "Abilities/TriDial/TriDialTypes.h"
#include "GameplayAbility_TriDialNode.generated.h"

class UCoreActionDataAsset;
class UCatalystDataAsset;
class UVectorDataAsset;
class UAbilitySystemComponent;
class UResonanceFieldComponent;
struct FGameplayAbilityTargetDataHandle;

/** Wire format for a dial configuration. Sent client -> server on activation and revalidated there. */
USTRUCT()
struct FTriDialLoadout
{
	GENERATED_BODY()

	UPROPERTY()
	TObjectPtr<const UCoreActionDataAsset> Core = nullptr;

	UPROPERTY()
	TObjectPtr<const UCatalystDataAsset> Catalyst = nullptr;

	UPROPERTY()
	TObjectPtr<const UVectorDataAsset> Vector = nullptr;

	bool operator==(const FTriDialLoadout& Other) const
	{
		return Core == Other.Core && Catalyst == Other.Catalyst && Vector == Other.Vector;
	}
};

/**
 * One granted ability instance representing the whole Tri-Dial matrix rather than one
 * ability per combination. The dials are swapped at runtime and the payload effect spec
 * is composed on activation, so N cores x M catalysts x K vectors costs N+M+K assets.
 */
UCLASS()
class VANCE_API UGameplayAbility_TriDialNode : public UGameplayAbility
{
	GENERATED_BODY()

public:
	UGameplayAbility_TriDialNode();

	UFUNCTION(BlueprintCallable, Category = "TriDial")
	bool SetDial(ETriDialSlot Slot, const UPrimaryDataAsset* DialAsset);

	UFUNCTION(BlueprintPure, Category = "TriDial")
	const FTriDialResolvedNode& GetResolvedNode() const { return ResolvedNode; }

	/** Authoring- and equip-time gate: rejects combinations either dial lists as incompatible. */
	UFUNCTION(BlueprintPure, Category = "TriDial")
	bool IsCombinationLegal(FGameplayTag& OutBlockingTag) const;

	virtual bool CanActivateAbility(
		const FGameplayAbilitySpecHandle Handle,
		const FGameplayAbilityActorInfo* ActorInfo,
		const FGameplayTagContainer* SourceTags,
		const FGameplayTagContainer* TargetTags,
		OUT FGameplayTagContainer* OptionalRelevantTags) const override;

	virtual void ActivateAbility(
		const FGameplayAbilitySpecHandle Handle,
		const FGameplayAbilityActorInfo* ActorInfo,
		const FGameplayAbilityActivationInfo ActivationInfo,
		const FGameplayEventData* TriggerEventData) override;

	virtual void EndAbility(
		const FGameplayAbilitySpecHandle Handle,
		const FGameplayAbilityActorInfo* ActorInfo,
		const FGameplayAbilityActivationInfo ActivationInfo,
		bool bReplicateEndAbility,
		bool bWasCancelled) override;

protected:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "TriDial")
	TObjectPtr<const UCoreActionDataAsset> CoreDial;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "TriDial")
	TObjectPtr<const UCatalystDataAsset> CatalystDial;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "TriDial")
	TObjectPtr<const UVectorDataAsset> VectorDial;

	UPROPERTY(Transient, BlueprintReadOnly, Category = "TriDial")
	FTriDialResolvedNode ResolvedNode;

	/** Folds Core -> Catalyst -> Vector modifiers and unions their tags. Idempotent; safe to re-run. */
	void ResolveNode();

	/** Builds the payload spec, applying resolved multipliers as SetByCaller magnitudes. */
	FGameplayEffectSpecHandle BuildPayloadSpec(const FGameplayAbilityActorInfo* ActorInfo) const;

	/** Applies reaction bonuses whose RequiredTargetTags are already present on the target. */
	void ApplyCatalystReactions(
		const FGameplayAbilityTargetDataHandle& TargetData,
		FGameplayEffectSpecHandle& PayloadSpec) const;

	/**
	 * Scales the Chaos strain threshold on struck geometry collections.
	 * StrainThresholdMultiplier < 1.0 is what makes Transmute.Geo collapse masonry that
	 * an unmodified Core.Kinetic strike would only chip.
	 */
	void ApplyStructuralStrain(const FGameplayAbilityTargetDataHandle& TargetData) const;

	/** Server-only. Publishes this activation's sphere so overlapping fields can resonate. */
	void EmitResonanceField(const FVector& Origin) const;

	UFUNCTION()
	void OnTargetDataReady(const FGameplayAbilityTargetDataHandle& TargetData);

	UFUNCTION(Server, Reliable, WithValidation)
	void ServerSetDialLoadout(FTriDialLoadout Loadout);

private:
	UPROPERTY(Transient)
	TObjectPtr<UResonanceFieldComponent> CachedResonanceComponent;
};
