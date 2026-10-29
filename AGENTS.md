# HM26 agent guidance

## Security review skill

- For security questions or reviews, read `.agents/skills/security-audit/SKILL.md` and the applicable companion files. The skill is project-local reference material; automatic discovery depends on the agent host.
- Follow higher-priority user and platform instructions. Installing or reading the skill is not itself a security audit and does not create new tools, permissions, or agent capabilities.
- The full workflow needs an explicit audit request, independent delegated reviewers, and the skill's OS-enforced execution sandbox. If these are unavailable, do not claim a full or independent audit; use source-first guidance and state the limits.
- Keep credentials and security findings out of the repository. Full-audit output belongs outside the target repository, unless the user explicitly chooses an ignored path as required by the skill.
