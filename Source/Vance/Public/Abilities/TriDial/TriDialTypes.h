#pragma once

#include "CoreMinimal.h"
#include "GameplayTagContainer.h"
#include "ScalableFloat.h"
#include "TriDialTypes.generated.h"

UENUM(BlueprintType)
enum class ETriDialSlot : uint8
{
	Core     UMETA(DisplayName = "Core Action"),
	Catalyst UMETA(DisplayName = "Catalyst"),
	Vector   UMETA(DisplayName = "Vector")
};

UENUM(BlueprintType)
enum class EVectorDelivery : uint8
{
	Self,
	Melee,
	Projectile,
	Radial,
	Beam,
	Conduit
};

/** Named magnitudes passed to the composed effect spec via SetByCaller. */
USTRUCT(BlueprintType)
struct FTriDialMagnitude
{
	GENERATED_BODY()

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Meta = (Categories = "Data"))
	FGameplayTag DataTag;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly)
	FScalableFloat Value;
};

/**
 * Multiplicative deltas a Catalyst folds onto the Core's magnitudes.
 * Identity is 1.0 across the board so an empty Catalyst slot is a no-op.
 */
USTRUCT(BlueprintType)
struct FTriDialModifierSet
{
	GENERATED_BODY()

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Meta = (ClampMin = "0.0"))
	float PotencyMultiplier = 1.0f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Meta = (ClampMin = "0.0"))
	float DurationMultiplier = 1.0f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Meta = (ClampMin = "0.0"))
	float RadiusMultiplier = 1.0f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Meta = (ClampMin = "0.0"))
	float CostMultiplier = 1.0f;

	/** Scales the Chaos strain threshold of struck geometry. Values below 1.0 make structures fail earlier. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Meta = (ClampMin = "0.0"))
	float StrainThresholdMultiplier = 1.0f;

	FTriDialModifierSet& Combine(const FTriDialModifierSet& Other)
	{
		PotencyMultiplier *= Other.PotencyMultiplier;
		DurationMultiplier *= Other.DurationMultiplier;
		RadiusMultiplier *= Other.RadiusMultiplier;
		CostMultiplier *= Other.CostMultiplier;
		StrainThresholdMultiplier *= Other.StrainThresholdMultiplier;
		return *this;
	}
};

/** Fully resolved dial combination, rebuilt whenever a slot changes and cached on the ability. */
USTRUCT(BlueprintType)
struct FTriDialResolvedNode
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly)
	FGameplayTagContainer CompositeTags;

	UPROPERTY(BlueprintReadOnly)
	FTriDialModifierSet Modifiers;

	UPROPERTY(BlueprintReadOnly)
	EVectorDelivery Delivery = EVectorDelivery::Self;

	UPROPERTY(BlueprintReadOnly)
	float EffectiveRadius = 0.0f;

	UPROPERTY(BlueprintReadOnly)
	float EffectiveCost = 0.0f;

	bool IsValid() const { return CompositeTags.Num() > 0; }
};
