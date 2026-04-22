/**
 * shared/ErrorBoundary.js — Development error boundary
 * Catches React errors and displays them on screen with component stack.
 */

import { html, Component } from '../lib/react.js';
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, stack: null };
  }

  static getDerivedStateFromError(error) {
    return { error: error.message || String(error) };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] React error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
    this.setState({ stack: info.componentStack });
  }

  render() {
    if (this.state.error) {
      return html`
        <div style="margin:1rem;padding:1rem;background:#2a0c0c;border:1px solid #fb7185;border-radius:8px;font-family:monospace">
          <div style="color:#fb7185;font-size:.85rem;font-weight:bold;margin-bottom:.5rem">
            ⚠ React Error (check console for full trace)
          </div>
          <div style="color:#fca5a5;font-size:.78rem;margin-bottom:.75rem;word-break:break-all">
            ${this.state.error}
          </div>
          ${this.state.stack && html`
            <details>
              <summary style="color:#f87171;font-size:.72rem;cursor:pointer">Component Stack</summary>
              <pre style="color:#fca5a5;font-size:.65rem;margin-top:.5rem;overflow-x:auto;white-space:pre-wrap">${this.state.stack}</pre>
            </details>
          `}
        </div>
      `;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
