#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "GameplayEffectTypes.h"
#include "TraumaPostProcessComponent.generated.h"

class UMaterialInstanceDynamic;
class UAbilitySystemComponent;

/**
 * Binds Health/Stress attribute deltas straight to the trauma post-process material.
 * There is no HUD widget in this path: the screen is the readout.
 */
UCLASS(ClassGroup = (Vance), Meta = (BlueprintSpawnableComponent))
class VANCE_API UTraumaPostProcessComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UTraumaPostProcessComponent();

	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;
	virtual void TickComponent(
		float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

protected:
	UPROPERTY(EditDefaultsOnly, Category = "Trauma")
	TObjectPtr<UMaterialInterface> TraumaMaterial;

	/** Seconds for the material to catch up to a change in attributes; prevents strobing on chip damage. */
	UPROPERTY(EditDefaultsOnly, Category = "Trauma", Meta = (ClampMin = "0.0"))
	float InterpolationSpeed = 4.0f;

	UPROPERTY(EditDefaultsOnly, Category = "Trauma")
	FName VignetteParameter = "VignetteIntensity";

	UPROPERTY(EditDefaultsOnly, Category = "Trauma")
	FName AberrationParameter = "ChromaticOffset";

	UPROPERTY(EditDefaultsOnly, Category = "Trauma")
	FName VolumetricParameter = "VolumetricDensity";

	void BindToAbilitySystem(UAbilitySystemComponent* AbilitySystem);
	void OnHealthChanged(const FOnAttributeChangeData& Data);
	void OnStressChanged(const FOnAttributeChangeData& Data);

private:
	UPROPERTY(Transient)
	TObjectPtr<UMaterialInstanceDynamic> TraumaMaterialInstance;

	float TargetTrauma = 0.0f;
	float CurrentTrauma = 0.0f;

	TArray<FDelegateHandle> AttributeHandles;
};
