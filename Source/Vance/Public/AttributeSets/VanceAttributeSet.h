#pragma once

#include "CoreMinimal.h"
#include "AbilitySystemComponent.h"
#include "AttributeSet.h"
#include "VanceAttributeSet.generated.h"

#define ATTRIBUTE_ACCESSORS(ClassName, PropertyName) \
	GAMEPLAYATTRIBUTE_PROPERTY_GETTER(ClassName, PropertyName) \
	GAMEPLAYATTRIBUTE_VALUE_GETTER(PropertyName) \
	GAMEPLAYATTRIBUTE_VALUE_SETTER(PropertyName) \
	GAMEPLAYATTRIBUTE_VALUE_INITTER(PropertyName)

/**
 * Player-facing attributes. Health and Stress drive the post-process trauma stack and the
 * wrist Biometric Plate directly; no HUD reads them through a separate model.
 */
UCLASS()
class VANCE_API UVanceAttributeSet : public UAttributeSet
{
	GENERATED_BODY()

public:
	UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_Health, Category = "Vitals")
	FGameplayAttributeData Health;
	ATTRIBUTE_ACCESSORS(UVanceAttributeSet, Health);

	UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_MaxHealth, Category = "Vitals")
	FGameplayAttributeData MaxHealth;
	ATTRIBUTE_ACCESSORS(UVanceAttributeSet, MaxHealth);

	/** 0-1. Drives chromatic aberration, vignette and volumetric density in the trauma material. */
	UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_Stress, Category = "Vitals")
	FGameplayAttributeData Stress;
	ATTRIBUTE_ACCESSORS(UVanceAttributeSet, Stress);

	UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_Charge, Category = "Resources")
	FGameplayAttributeData Charge;
	ATTRIBUTE_ACCESSORS(UVanceAttributeSet, Charge);

	UPROPERTY(BlueprintReadOnly, ReplicatedUsing = OnRep_MaxCharge, Category = "Resources")
	FGameplayAttributeData MaxCharge;
	ATTRIBUTE_ACCESSORS(UVanceAttributeSet, MaxCharge);

	virtual void PreAttributeChange(const FGameplayAttribute& Attribute, float& NewValue) override;
	virtual void PostGameplayEffectExecute(const FGameplayEffectModCallbackData& Data) override;
	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

protected:
	UFUNCTION()
	void OnRep_Health(const FGameplayAttributeData& OldValue);

	UFUNCTION()
	void OnRep_MaxHealth(const FGameplayAttributeData& OldValue);

	UFUNCTION()
	void OnRep_Stress(const FGameplayAttributeData& OldValue);

	UFUNCTION()
	void OnRep_Charge(const FGameplayAttributeData& OldValue);

	UFUNCTION()
	void OnRep_MaxCharge(const FGameplayAttributeData& OldValue);
};
