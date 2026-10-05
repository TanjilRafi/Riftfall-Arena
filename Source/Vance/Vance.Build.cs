using UnrealBuildTool;

public class Vance : ModuleRules
{
	public Vance(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"InputCore",
			"EnhancedInput",
			"GameplayAbilities",
			"GameplayTags",
			"GameplayTasks",
			"ModularGameplay",
			"MassEntity",
			"MassCommon",
			"MassSpawner",
			"MassMovement",
			"MassRepresentation",
			"GeometryCollectionEngine",
			"FieldSystemEngine",
			"Chaos",
			"ChaosSolverEngine",
			"UMG",
			"CommonUI",
			"NetCore"
		});

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"Slate",
			"SlateCore",
			"RenderCore",
			"Json",
			"JsonUtilities",
			"WebSockets"
		});
	}
}
