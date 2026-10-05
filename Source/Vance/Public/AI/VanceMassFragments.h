#pragma once

#include "CoreMinimal.h"
#include "MassEntityTypes.h"
#include "GameplayTagContainer.h"
#include "VanceMassFragments.generated.h"

/** Which backend region an agent belongs to; the key economy updates are batched under. */
USTRUCT()
struct FRegionAffiliationFragment : public FMassFragment
{
	GENERATED_BODY()

	UPROPERTY()
	FName RegionId;

	UPROPERTY()
	int32 FactionId = 0;
};

/** Per-agent economic role, consumed by the trade processor when agents reach a market node. */
USTRUCT()
struct FEconomyAgentFragment : public FMassFragment
{
	GENERATED_BODY()

	UPROPERTY()
	FGameplayTag GoodTag;

	UPROPERTY()
	float CarriedQuantity = 0.0f;

	UPROPERTY()
	float LastKnownPriceMultiplier = 1.0f;
};

/** Daily schedule offsets so background NPCs move without individual behavior trees. */
USTRUCT()
struct FScheduleFragment : public FMassFragment
{
	GENERATED_BODY()

	UPROPERTY()
	float DayPhaseOffset = 0.0f;

	UPROPERTY()
	uint8 CurrentActivity = 0;
};

/** Tag fragment marking agents whose region moves need flushing to the Python backend. */
USTRUCT()
struct FPendingBackendSyncTag : public FMassTag
{
	GENERATED_BODY()
};
