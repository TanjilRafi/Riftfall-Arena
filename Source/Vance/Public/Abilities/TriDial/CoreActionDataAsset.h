#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "GameplayTagContainer.h"
#include "Abilities/TriDial/TriDialTypes.h"
#include "CoreActionDataAsset.generated.h"

class UGameplayEffect;
class UAnimMontage;

/**
 * Dial 1. The verb: what energy is spent and what damage/state effect it carries.
 * Owns the base GameplayEffect; Catalyst and Vector only ever scale or redirect it.
 */
UCLASS(BlueprintType, Const)
class VANCE_API UCoreActionDataAsset : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Identity", Meta = (Categories = "Core"))
	FGameplayTag CoreTag;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Identity")
	FText DisplayName;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Effect")
	TSubclassOf<UGameplayEffect> PayloadEffectClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Effect")
	TArray<FTriDialMagnitude> BaseMagnitudes;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Effect")
	FTriDialModifierSet BaseModifiers;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Cost")
	FScalableFloat BaseCost;

	/** Tags granted to the target on application, e.g. State.Wet, State.Charged, Material.Brittle. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "State", Meta = (Categories = "State"))
	FGameplayTagContainer GrantedStateTags;

	/** Slots this Core refuses to combine with; validated at authoring time and again on equip. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Constraints")
	FGameplayTagContainer IncompatibleTags;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Presentation")
	TSoftObjectPtr<UAnimMontage> CastMontage;

	virtual FPrimaryAssetId GetPrimaryAssetId() const override
	{
		return FPrimaryAssetId(TEXT("TriDialCore"), GetFName());
	}
};
