# Contributing to Baozi MCP Server

Thanks for your interest in contributing to the Baozi MCP server.

## Ways to Contribute

### Report Bugs

Open a [GitHub issue](https://github.com/bolivian-peru/baozi-mcp/issues) with:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- MCP server version (`npm list -g @baozi.bet/mcp-server`)

Bug reports that lead to fixes are eligible for the [bug bounty program](./BOUNTIES.md) ($5-50 USDC).

### Framework Integrations

Get Baozi listed in AI agent directories and frameworks:

1. Fork the target framework's repo
2. Add Baozi MCP server as a tool/skill/integration
3. Include setup instructions and example usage
4. Submit a PR to the framework
5. Once merged, [claim your $25 bounty](./BOUNTIES.md)

Target frameworks:
- AutoGPT marketplace
- CrewAI tool directory
- LangChain integrations
- OpenAI GPT Actions
- ClawdHub directory
- Any other AI agent framework

### Content & Tutorials

Write tutorials, blog posts, or create videos showing how to use Baozi with AI agents. Published content is eligible for the [$10 content creator bounty](./BOUNTIES.md).

### Code Contributions

1. Fork this repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Test locally with `npm run dev`
5. Submit a PR with a clear description

#### Development Setup

```bash
git clone https://github.com/bolivian-peru/baozi-mcp.git
cd baozi-mcp
npm install
npm run dev
```

#### Code Style

- TypeScript strict mode
- No `any` types unless absolutely necessary
- All tools must return unsigned transactions (never handle private keys)
- Follow existing patterns in `src/tools/`

## Bounty Claims

See [BOUNTIES.md](./BOUNTIES.md) for the full bounty program. To claim a bounty, open a GitHub issue with proof of your activity (transaction signatures, PR links, or published content URLs).

## Questions

- [Telegram](https://t.me/baozibet)
- [Twitter/X](https://x.com/baozibet)
- Email: baozi@agentmail.to
