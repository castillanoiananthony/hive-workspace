import { describe, expect, it } from "vitest";
import { gitLink } from "../git-link";

describe("git links", () => {
  it("labels GitHub pull requests, issues, commits, branches and repos", () => {
    expect(gitLink("https://github.com/acme/kibo/pull/42")?.label).toBe("PR #42");
    expect(gitLink("https://github.com/acme/kibo/issues/7")?.label).toBe("Issue #7");
    expect(gitLink("https://github.com/acme/kibo/commit/a1b2c3d4e5f6")?.label).toBe("Commit a1b2c3d");
    expect(gitLink("https://github.com/acme/kibo/tree/feature/login-fix")?.label).toBe("Branch feature/login-fix");
    expect(gitLink("https://github.com/acme/kibo")?.label).toBe("Repo acme/kibo");
  });
  it("understands GitLab's /-/ paths and merge requests", () => {
    expect(gitLink("https://gitlab.com/group/sub/app/-/merge_requests/3")).toMatchObject({ host: "GitLab", label: "MR #3", repo: "group/sub/app" });
  });
  it("ignores everything else", () => {
    expect(gitLink("https://drive.google.com/x")).toBeNull();
    expect(gitLink("nope")).toBeNull();
  });
});
