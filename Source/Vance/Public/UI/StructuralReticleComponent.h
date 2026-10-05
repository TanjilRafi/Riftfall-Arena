#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "GameplayTagContainer.h"
#include "StructuralReticleComponent.generated.h"

/** What the aim trace found this frame; drives aperture scale on the diegetic reticle. */
USTRUCT(BlueprintType)
struct FReticleReadout
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly)
	float StructuralIntegrity = 1.0f;

	UPROPERTY(BlueprintReadOnly)
	float TargetStress = 0.0f;

	UPROPERTY(BlueprintReadOnly)
	float Distance = 0.0f;

	UPROPERTY(BlueprintReadOnly)
	FGameplayTagContainer MaterialTags;

	UPROPERTY(BlueprintReadOnly)
	bool bHasTarget = false;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnReticleReadout, const FReticleReadout&, Readout);

/**
 * Traces from the camera each frame and reports what the player is about to hit.
 * Aperture widens as the target's remaining strain headroom shrinks, so the crosshair
 * itself is the structural-weakness indicator rather than a separate UI element.
 */
UCLASS(ClassGroup = (Vance), Meta = (BlueprintSpawnableComponent))
class VANCE_API UStructuralReticleComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UStructuralReticleComponent();

	virtual void TickComponent(
		float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

	UPROPERTY(BlueprintAssignable, Category = "Reticle")
	FOnReticleReadout OnReadout;

	UFUNCTION(BlueprintPure, Category = "Reticle")
	float GetApertureScale() const;

protected:
	UPROPERTY(EditDefaultsOnly, Category = "Reticle", Meta = (ClampMin = "0.0"))
	float TraceDistance = 6000.0f;

	/** Trace runs on a fixed cadence, not every frame; the reticle interpolates between samples. */
	UPROPERTY(EditDefaultsOnly, Category = "Reticle", Meta = (ClampMin = "0.0"))
	float TraceIntervalSeconds = 0.05f;

	UPROPERTY(EditDefaultsOnly, Category = "Reticle")
	FVector2D ApertureRange = FVector2D(0.6f, 2.4f);

	void RunAimTrace();
	float ReadStructuralIntegrity(const FHitResult& Hit) const;

private:
	FReticleReadout CachedReadout;
	float TimeSinceTrace = 0.0f;
	float SmoothedAperture = 1.0f;
};
