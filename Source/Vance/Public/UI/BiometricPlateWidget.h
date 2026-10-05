#pragma once

#include "CoreMinimal.h"
#include "CommonUserWidget.h"
#include "GameplayEffectTypes.h"
#include "BiometricPlateWidget.generated.h"

class UCommonTextBlock;
class UProgressBar;

/**
 * Wrist-mounted plate rendered through a 3D WidgetComponent on the character mesh.
 * It is a physical object in the world, so it can be occluded, damaged, and read by
 * other players; nothing here draws to the screen space overlay.
 */
UCLASS()
class VANCE_API UBiometricPlateWidget : public UCommonUserWidget
{
	GENERATED_BODY()

public:
	virtual void NativeConstruct() override;
	virtual void NativeDestruct() override;

protected:
	UPROPERTY(BlueprintReadOnly, Meta = (BindWidget))
	TObjectPtr<UProgressBar> VitalsBar;

	UPROPERTY(BlueprintReadOnly, Meta = (BindWidget))
	TObjectPtr<UProgressBar> ChargeBar;

	UPROPERTY(BlueprintReadOnly, Meta = (BindWidget))
	TObjectPtr<UCommonTextBlock> DialReadout;

	/** Degrades legibility as Stress rises: the plate gets harder to read as the player worsens. */
	UPROPERTY(EditDefaultsOnly, Category = "Plate")
	FName SignalNoiseParameter = "SignalNoise";

	UFUNCTION(BlueprintImplementableEvent, Category = "Plate")
	void OnDialLoadoutChanged(const FGameplayTagContainer& CompositeTags);

	void HandleAttributeChanged(const FOnAttributeChangeData& Data);

private:
	TArray<FDelegateHandle> AttributeHandles;
};
