#pragma once

#include "CoreMinimal.h"
#include "GameplayTagContainer.h"
#include "Networking/ResonanceFieldComponent.h"
#include "Subsystems/WorldSubsystem.h"
#include "ResonanceSubsystem.generated.h"

class UGameplayEffect;

/** Authored pairing rule: two fields carrying these tags produce ResultTag's combined effect. */
USTRUCT(BlueprintType)
struct FResonanceRecipe
{
	GENERATED_BODY()

	UPROPERTY(EditDefaultsOnly, Meta = (Categories = "Element,Core"))
	FGameplayTag TagA;

	UPROPERTY(EditDefaultsOnly, Meta = (Categories = "Element,Core"))
	FGameplayTag TagB;

	UPROPERTY(EditDefaultsOnly, Meta = (Categories = "Resonance"))
	FGameplayTag ResultTag;

	UPROPERTY(EditDefaultsOnly)
	TSubclassOf<UGameplayEffect> CombinedEffectClass;

	UPROPERTY(EditDefaultsOnly, Meta = (ClampMin = "0.0"))
	float ResultRadiusScale = 1.5f;
};

/**
 * Server-authoritative pairing of overlapping ability fields from *different* instigators.
 *
 * Two clients cannot land their activations on the same frame, so fields stay live for
 * ResonanceWindowFrames and pairing runs once per tick over that buffer. Widening the window
 * makes resonance easier to trigger across high-ping pairs; narrowing it tightens the timing skill.
 */
UCLASS()
class VANCE_API UResonanceSubsystem : public UTickableWorldSubsystem
{
	GENERATED_BODY()

public:
	virtual bool DoesSupportWorldType(const EWorldType::Type WorldType) const override;
	virtual void Tick(float DeltaTime) override;
	virtual TStatId GetStatId() const override;

	void RegisterField(const FResonanceField& Field);

protected:
	/** Culls expired fields, then spawns one combined effect per matched pair. */
	void ResolvePairings();

	bool FindRecipe(
		const FGameplayTagContainer& TagsA,
		const FGameplayTagContainer& TagsB,
		FResonanceRecipe& OutRecipe) const;

	void SpawnResonance(
		const FResonanceField& FieldA,
		const FResonanceField& FieldB,
		const FResonanceRecipe& Recipe);

	UPROPERTY(EditDefaultsOnly, Category = "Resonance")
	TArray<FResonanceRecipe> Recipes;

	UPROPERTY(EditDefaultsOnly, Category = "Resonance", Meta = (ClampMin = "1"))
	int32 ResonanceWindowFrames = 6;

private:
	TArray<FResonanceField> LiveFields;
};
