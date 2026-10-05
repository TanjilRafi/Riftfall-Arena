#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "GameplayTagContainer.h"
#include "Abilities/TriDial/TriDialTypes.h"
#include "VectorDataAsset.generated.h"

class AGameplayAbilityTargetActor;
class AFieldSystemActor;

/**
 * Dial 3. The delivery: how the composed payload reaches the world, and what
 * Chaos field it emits on impact. Owns targeting; carries no damage of its own.
 */
UCLASS(BlueprintType, Const)
class VANCE_API UVectorDataAsset : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Identity", Meta = (Categories = "Vector"))
	FGameplayTag VectorTag;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Identity")
	FText DisplayName;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Delivery")
	EVectorDelivery Delivery = EVectorDelivery::Projectile;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Delivery")
	TSubclassOf<AGameplayAbilityTargetActor> TargetActorClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Delivery", Meta = (ClampMin = "0.0"))
	float BaseRadius = 0.0f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Delivery", Meta = (ClampMin = "0.0"))
	float MaxRange = 3000.0f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Delivery")
	FTriDialModifierSet Modifiers;

	/** Strain/force field injected into Chaos geometry collections at the impact point. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Chaos")
	TSubclassOf<AFieldSystemActor> ImpactFieldClass;

	/** Whether this delivery publishes a resonance sphere for co-op overlap detection on the server. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Resonance")
	bool bEmitsResonanceField = true;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Constraints")
	FGameplayTagContainer IncompatibleTags;

	virtual FPrimaryAssetId GetPrimaryAssetId() const override
	{
		return FPrimaryAssetId(TEXT("TriDialVector"), GetFName());
	}
};
