# Legal and Licensing Guide for sport-cli

## License Status

### Upstream License
Google's gemini-cli is licensed under **Apache License 2.0**
- Source: https://github.com/google-gemini/gemini-cli
- Full text: https://www.apache.org/licenses/LICENSE-2.0

### Our Fork License
sport-cli maintains the same **Apache License 2.0** (as required)

### What This Means
✅ **You CAN:**
- Use commercially
- Modify
- Distribute
- Use privately
- Place warranty

❌ **You CANNOT:**
- Use Google trademarks
- Hold Google liable
- Remove copyright notices

⚠️ **You MUST:**
- Include copyright notice
- Include license
- State changes
- Include NOTICE if applicable

## Required Attributions

### In Source Files
```javascript
/**
 * Copyright 2025 Google LLC (original work)
 * Copyright 2025 SportsCulture (modifications)
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     https://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
```

### In README
```markdown
## Acknowledgments

sport-cli is a fork of [Google's gemini-cli](https://github.com/google-gemini/gemini-cli), 
originally created by Google LLC and licensed under Apache 2.0.

Major modifications include:
- Multi-provider support
- Plugin architecture
- Enhanced transparency features
- Configurable paths
[... list key changes ...]
```

### In Package.json
```json
{
  "name": "@sportsculture/sport-cli",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/sportsculture/sport-cli"
  },
  "forkedFrom": "https://github.com/google-gemini/gemini-cli"
}
```

## Trademark Considerations

### Must Change
- ❌ "Gemini" → ✅ "sport"
- ❌ Google branding → ✅ SportsCulture branding
- ❌ Google logos → ✅ Your logos

### Can Keep
- ✅ Technical references to Gemini API
- ✅ Attribution to Google as original author
- ✅ Links to upstream repo

## NOTICE File

Create `NOTICE` file in repo root:

```
sport-cli
Copyright 2025 SportsCulture

This product includes software originally developed by Google LLC
as gemini-cli (https://github.com/google-gemini/gemini-cli).

Original Copyright 2025 Google LLC

Licensed under the Apache License, Version 2.0

===============================================================================

This product includes the following third-party software:

1. [Library Name]
   - License: [License Type]
   - Copyright: [Copyright Holder]

[... list all dependencies ...]
```

## Third-Party Dependencies

### Audit Process
```bash
# Check all licenses
npm run license-check

# Generate license report
sport licenses audit > THIRD_PARTY_LICENSES.txt
```

### Acceptable Licenses
✅ Safe to include:
- MIT
- Apache 2.0
- BSD (2-clause, 3-clause)
- ISC
- CC0

⚠️ Review carefully:
- LGPL (dynamic linking only)
- MPL 2.0
- CC-BY

❌ Avoid:
- GPL (any version)
- AGPL
- Proprietary licenses
- No license

## Contribution Agreement

### For Contributors

Create `CONTRIBUTING.md`:

```markdown
# Contributing to sport-cli

By contributing, you agree that:

1. Your contributions are your original work
2. You have the right to submit under Apache 2.0
3. You grant SportsCulture a perpetual, worldwide, non-exclusive,
   royalty-free license to use your contributions
4. You understand contributions may be public and included in releases

## Developer Certificate of Origin

All commits must be signed off:
```bash
git commit -s -m "Your commit message"
```

This indicates you agree to the DCO: https://developercertificate.org/
```

### CLA (Optional but Recommended)

For significant contributors, consider a Contributor License Agreement:

```yaml
# .github/workflows/cla.yml
name: "CLA Assistant"
on:
  issue_comment:
    types: [created]
  pull_request_target:
    types: [opened,closed,synchronize]

jobs:
  CLAAssistant:
    runs-on: ubuntu-latest
    steps:
      - name: "CLA Assistant"
        uses: cla-assistant/github-action@v2.1.3-beta
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PERSONAL_ACCESS_TOKEN: ${{ secrets.CLA_ASSISTANT_TOKEN }}
        with:
          path-to-signatures: 'signatures/version1/cla.json'
          path-to-document: 'CLA.md'
          branch: 'cla-signatures'
```

## Patent Considerations

Apache 2.0 includes patent grants, meaning:
- Google grants patent licenses for their contributions
- You grant patent licenses for your contributions
- Users receive patent licenses from all contributors

## Commercial Use

### You CAN:
- ✅ Sell sport-cli
- ✅ Offer paid support
- ✅ Include in commercial products
- ✅ Charge for plugins

### You MUST:
- ⚠️ Maintain Apache 2.0 license
- ⚠️ Provide attribution
- ⚠️ State modifications

### You CANNOT:
- ❌ Claim Google endorsement
- ❌ Use Google trademarks
- ❌ Misrepresent origin

## Risk Mitigation

### Code Scanning
```bash
# Regular security scans
npm audit
sport security scan

# License compliance
sport licenses verify
```

### Documentation
Maintain clear records of:
- Origin of each feature
- Author of significant changes
- Date of modifications
- Reason for divergence

### Insurance
Consider:
- Open source liability insurance
- Errors & omissions coverage
- General liability including IP

## Handling License Violations

If someone violates your Apache 2.0 rights:

1. **Document** the violation
2. **Contact** violator with cease & desist
3. **File** DMCA if hosted online
4. **Consult** legal counsel for enforcement

## FAQ

**Q: Can we change the license?**
A: No, Apache 2.0 requires derivative works use the same license.

**Q: Can we dual-license plugins?**
A: Yes, plugins can have different licenses if they're truly separate.

**Q: Do we need Google's permission?**
A: No, Apache 2.0 grants permission to fork and modify.

**Q: Can we remove Google's copyright?**
A: No, you must maintain all copyright notices.

**Q: Can we monetize sport-cli?**
A: Yes, commercial use is explicitly allowed.

## Updates and Compliance

This document last updated: July 17, 2025

Review quarterly or when:
- Major features added
- Upstream license changes
- New dependencies added
- Legal questions arise

---

*Disclaimer: This document provides general guidance based on the Apache 2.0 license. 
For specific legal advice, consult with an attorney specializing in open source licensing.*