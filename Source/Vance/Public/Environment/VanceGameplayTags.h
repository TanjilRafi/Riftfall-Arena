#pragma once

#include "CoreMinimal.h"
#include "NativeGameplayTags.h"

/**
 * Native tags for the state-interaction layer. Everything the physics/chemistry matrix keys
 * off lives here so C++ can compare without string lookups; content adds leaf tags in the
 * .ini as needed.
 */
namespace VanceTags
{
	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Core_Kinetic);
	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Core_Thermal);
	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Core_Sever);

	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Element_Volt);
	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Element_Cryo);
	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Element_Corrosive);

	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Transmute_Geo);
	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Transmute_Aqua);

	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(State_Wet);
	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(State_Charged);
	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(State_Burning);
	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(State_Trauma);

	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Material_Brittle);
	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Material_Masonry);
	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Material_Conductive);

	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Resonance_SuperCavitation);
	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Resonance_Vitrify);

	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Data_Duration);
	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Data_Radius);
	VANCE_API UE_DECLARE_GAMEPLAY_TAG_EXTERN(Data_ReactionPotency);
}
