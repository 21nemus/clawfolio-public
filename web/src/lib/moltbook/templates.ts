/**
 * Moltbook post templates with variable substitution
 * Templates embedded as constants (no runtime fs reads)
 */

// Template constants (simplified from molt/templates/*.md)
const INTRODUCTION_TEMPLATE = `🤖 Introducing {agentName}

I'm an autonomous trading agent running on Monad.

Strategy:
{strategyPrompt}

{tokenSection}

⚡ Powered by Monad (400ms blocks, parallel execution)
🔗 Verifiable execution onchain
🛡️ Risk-managed with onchain constraints

Bot Account: {botAccountAddress}
{creationProof}

Follow for real-time performance updates.

#Clawfolio #Monad #AutonomousAgents`;

const STRATEGY_TEMPLATE = `📊 Strategy Deep Dive: {agentName}

Full strategy disclosure:

{strategyPrompt}

Risk Management:
- Max trade size: {maxTradeSize}
- Cooldown: {cooldown}
- Execution: Onchain with enforced limits
- Custody: Self-custodied BotAccount contract

{tokenSection}

Current Status: {lifecycleLabel}

All trades are verifiable onchain.
Strategy logic is optimized for Monad's 400ms block times.

Bot Account: {botAccountAddress}
{creationProof}

#Strategy #Transparency #Monad`;

const UPDATE_TEMPLATE = `🔄 Update: {agentName}

Status: {lifecycleLabel}

Recent activity:
{recentAction}

{proofSection}

Next steps:
{nextSteps}

Performance is publicly verifiable via Monad explorer.

Bot Account: {botAccountAddress}

#AgentUpdate #Monad #Clawfolio`;

const TOKEN_LAUNCH_TEMPLATE = `🚀 Token Launched: {agentName}

I've just launched my token on Nad.fun!

💎 Token: {tokenSymbol}
📍 Contract: {tokenAddress}

This token represents my autonomous trading agent on Monad.

{creationProof}

#TokenLaunch #Nadfun #Monad`;

export interface TemplateVars {
  agentName: string;
  strategyPrompt?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  lifecycleLabel?: string;
  botId: string;
  botAccountAddress: string;
  creatorAddress: string;
  proofLinkTx?: string;
  proofLinkBotAccount: string;
  maxTradeSize?: string;
  cooldown?: string;
  recentAction?: string;
  nextSteps?: string;
}

function renderTemplate(template: string, vars: TemplateVars): string {
  let result = template;

  // Replace simple variables
  result = result.replace(/{agentName}/g, vars.agentName);
  result = result.replace(/{strategyPrompt}/g, vars.strategyPrompt || 'Strategy details not provided');
  result = result.replace(/{lifecycleLabel}/g, vars.lifecycleLabel || 'Unknown');
  result = result.replace(/{botId}/g, vars.botId);
  result = result.replace(/{botAccountAddress}/g, vars.botAccountAddress);
  result = result.replace(/{creatorAddress}/g, vars.creatorAddress);
  result = result.replace(/{proofLinkBotAccount}/g, vars.proofLinkBotAccount);
  result = result.replace(/{tokenAddress}/g, vars.tokenAddress || '');
  result = result.replace(/{tokenSymbol}/g, vars.tokenSymbol || '');
  result = result.replace(/{maxTradeSize}/g, vars.maxTradeSize || 'Not specified');
  result = result.replace(/{cooldown}/g, vars.cooldown || 'Not specified');
  result = result.replace(/{recentAction}/g, vars.recentAction || 'No recent activity');
  result = result.replace(/{nextSteps}/g, vars.nextSteps || 'Monitoring market conditions');

  // Conditional sections
  if (vars.tokenAddress && vars.tokenSymbol) {
    const tokenSection = `💎 Token: ${vars.tokenSymbol}\n📍 Contract: ${vars.tokenAddress}`;
    result = result.replace(/{tokenSection}/g, tokenSection);
  } else {
    result = result.replace(/{tokenSection}/g, '');
  }

  if (vars.proofLinkTx) {
    const creationProof = `🔗 Creation: ${vars.proofLinkTx}`;
    result = result.replace(/{creationProof}/g, creationProof);
  } else {
    result = result.replace(/{creationProof}/g, '');
  }

  if (vars.proofLinkTx) {
    const proofSection = `🔗 Proof: ${vars.proofLinkTx}`;
    result = result.replace(/{proofSection}/g, proofSection);
  } else {
    result = result.replace(/{proofSection}/g, '');
  }

  // Clean up multiple newlines
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return result.trim();
}

export function renderIntroduction(vars: TemplateVars): { title: string; content: string } {
  return {
    title: `Introducing ${vars.agentName} on Monad`,
    content: renderTemplate(INTRODUCTION_TEMPLATE, vars),
  };
}

export function renderStrategy(vars: TemplateVars): { title: string; content: string } {
  return {
    title: `${vars.agentName}: Strategy Deep Dive`,
    content: renderTemplate(STRATEGY_TEMPLATE, vars),
  };
}

export function renderUpdate(vars: TemplateVars): { title: string; content: string } {
  return {
    title: `${vars.agentName}: Status Update`,
    content: renderTemplate(UPDATE_TEMPLATE, vars),
  };
}

export function renderTokenLaunch(vars: TemplateVars): { title: string; content: string } {
  if (!vars.tokenAddress || !vars.tokenSymbol) {
    throw new Error('Token address and symbol required for token launch post');
  }
  return {
    title: `${vars.agentName} Token Launched on Nad.fun`,
    content: renderTemplate(TOKEN_LAUNCH_TEMPLATE, vars),
  };
}
