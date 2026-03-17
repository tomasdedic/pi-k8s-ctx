# Context Awareness Feature ✅

## What Changed

When you switch Kubernetes contexts with `/ctx switch`, the extension now **adds a message to the conversation history** so the LLM knows which cluster you're using.

## How It Works

### When You Switch Contexts

```
/ctx switch lab1
```

**What happens:**
1. Switches to lab1 context
2. Shows notification: "Switched to: lab1"
3. **Adds to conversation:** "Switched Kubernetes context to: lab1"

### The LLM Can Now See:

```
User: /ctx switch lab1
[System] Switched Kubernetes context to: lab1

User: What pods are running?
Assistant: Let me check the pods in your lab1 cluster...
```

## Example Workflow

```bash
# In pi session
/ctx switch lab1
# Message added: "Switched Kubernetes context to: lab1"

# Now ask questions - the LLM knows you're on lab1
> List all pods in the current cluster
# LLM knows it's lab1

/ctx switch prod
# Message added: "Switched Kubernetes context to: prod"

# LLM now knows you switched to prod
> Check deployment status
# LLM knows it's now prod cluster
```

## Show Current Context

```
/ctx current
```

Also adds the current context to conversation:
```
Using Kubernetes context: lab1
```

## Benefits

✅ **LLM Awareness** - AI knows which cluster you're working with  
✅ **Context Tracking** - Context switches are part of conversation history  
✅ **Better Responses** - LLM can reference the correct cluster name  
✅ **Session Replay** - When browsing history, you'll see which cluster was active

## Technical Details

The extension uses `pi.sendMessage()` to add custom messages:
```typescript
pi.sendMessage({
  customType: "k8s-context",
  content: `Switched Kubernetes context to: ${name}`,
  display: true,
  details: { cluster: name, action: "switch" },
});
```

These messages:
- Appear in the conversation
- Are visible to the LLM
- Are stored in session history
- Don't trigger a new turn

## Try It

```bash
pi
> /ctx switch lab1
> what cluster am I on?
# The LLM will know it's lab1!
```

The LLM can now track and reference which Kubernetes cluster you're working with throughout your session.
