#include "Networking/ResonanceFieldComponent.h"

#include "Engine/World.h"
#include "Networking/ResonanceSubsystem.h"

UResonanceFieldComponent::UResonanceFieldComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
	SetIsReplicatedByDefault(false);
}

void UResonanceFieldComponent::PublishField(
	const FVector& Origin, float Radius, const FGameplayTagContainer& Tags)
{
	UWorld* World = GetWorld();
	if (!World || World->GetNetMode() == NM_Client)
	{
		return;
	}

	UResonanceSubsystem* Subsystem = World->GetSubsystem<UResonanceSubsystem>();
	if (!Subsystem)
	{
		return;
	}

	FResonanceField Field;
	Field.Instigator = GetOwner();
	Field.Origin = Origin;
	Field.Radius = Radius;
	Field.Tags = Tags;
	Field.ServerFrame = GFrameCounter;
	Field.PublishTimeSeconds = World->GetTimeSeconds();

	Subsystem->RegisterField(Field);
}
