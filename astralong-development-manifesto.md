# Astra/log Development Manifesto

## The Prime Directive: Transience
The value of an Astra/log session is the high-fidelity insight gained, not the files saved. Every technical decision must support the principle of **Zero-Persistence**—once a session is reset or the tab is closed, all filesystem data and chat history are permanently destroyed.

## AI Usage & Ethics
Astra/log is built with a "Consultant-Only" AI model. We believe the AI should be an architectural partner and brainstorming consultant, not an automated coding agent.
* **AI-Assisted Development**: This project utilizes AI for architectural planning, code review, and boilerplate generation.
* **Human Oversight**: No AI-generated code is committed without manual validation and security auditing.
* **The Grok Prohibition**: We maintain a strict technical and ethical boundary against the use of Grok. Integrating or using Grok with this codebase terminates the license.

## Design Ethos: Calm Futurism
We prioritize "Calm Futurism" to minimize cognitive load.
* **Nebula-Glass UI**: The interface uses high-depth "nebula-glass" environments with translucent layers and subtle radial gradients.
* **Ambient Feedback**: Replace verbose logs with subtle visual signals, such as the `glow-success` pulse for "ready" states.

## Privacy of Thought
A strict boundary is maintained between public AI-assisted chat and the **Offline Scratch Pad**. Raw, unfiltered private notes remain local-only and are never sent to AI providers unless explicitly staged by the user.