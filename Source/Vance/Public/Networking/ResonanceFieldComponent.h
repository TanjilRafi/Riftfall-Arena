#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "GameplayTagContainer.h"
#include "ResonanceFieldComponent.generated.h"

/** One spatial field published by an ability activation, valid for a short server window. */
USTRUCT()
struct FResonanceField
{
	GENERATED_BODY()

	UPROPERTY()
	TWeakObjectPtr<AActor> Instigator;

	UPROPERTY()
	FVector Origin = FVector::ZeroVector;

	UPROPERTY()
	float Radius = 0.0f;

	UPROPERTY()
	FGameplayTagContainer Tags;

	/** Server frame the field was published on; pairing requires two fields inside the same window. */
	uint64 ServerFrame = 0;

	double PublishTimeSeconds = 0.0;
};

UCLASS(ClassGroup = (Vance), Meta = (BlueprintSpawnableComponent))
class VANCE_API UResonanceFieldComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UResonanceFieldComponent();

	/** Server-only. Registers a field with the world subsystem for this tick's pairing pass. */
	void PublishField(const FVector& Origin, float Radius, const FGameplayTagContainer& Tags);
};
