#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "GameplayTagContainer.h"
#include "Abilities/TriDial/TriDialTypes.h"
#include "CatalystDataAsset.generated.h"

class UGameplayEffect;

/** A conditional bonus that fires only when the target already carries RequiredTargetTags. */
USTRUCT(BlueprintType)
struct FCatalystReaction
{
	GENERATED_BODY()

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Meta = (Categories = "State"))
	FGameplayTagContainer RequiredTargetTags;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly)
	FTriDialModifierSet ReactionModifiers;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly)
	TSubclassOf<UGameplayEffect> BonusEffectClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Meta = (Categories = "Resonance"))
	FGameplayTag ResonanceTag;
};

/**
 * Dial 2. The chemistry: scales the Core's magnitudes and opens reactions against
 * state the target already carries (Volt into State.Wet, Geo into Material.Brittle).
 */
UCLASS(BlueprintType, Const)
class VANCE_API UCatalystDataAsset : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Identity", Meta = (Categories = "Catalyst"))
	FGameplayTag CatalystTag;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Identity")
	FText DisplayName;

	/** Element imparted to the composed effect, e.g. Element.Volt, Element.Thermal, Transmute.Geo. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Identity", Meta = (Categories = "Element"))
	FGameplayTag ElementTag;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Modifiers")
	FTriDialModifierSet Modifiers;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Modifiers")
	TArray<FCatalystReaction> Reactions;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "State", Meta = (Categories = "State"))
	FGameplayTagContainer AppliedStateTags;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Constraints")
	FGameplayTagContainer IncompatibleTags;

	virtual FPrimaryAssetId GetPrimaryAssetId() const override
	{
		return FPrimaryAssetId(TEXT("TriDialCatalyst"), GetFName());
	}
};
