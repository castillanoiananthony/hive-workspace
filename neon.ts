import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  auth: false,
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // "dev" is the long-lived branch localhost uses; other new branches auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return branch.name === "dev" ? {} : { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
