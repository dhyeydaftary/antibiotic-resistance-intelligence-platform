import { Component } from 'react';

// Top-level fallback for uncaught render errors anywhere in the app —
// without this, React unmounts the whole tree to a blank white screen.
// Error boundaries must be class components; hooks have no equivalent to
// getDerivedStateFromError/componentDidCatch.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
          <div className="max-w-sm rounded-[20px] border border-resistant/30 bg-resistant/5 p-8 text-center">
            <p className="font-sans text-[16px] font-medium text-page-ink">
              Something went wrong.
            </p>
            <p className="mt-2 font-sans text-[14px] text-page-muted">
              Please reload the page.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center justify-center rounded-[10px] bg-accent-blue px-6 py-2.5 font-sans text-[14px] font-medium text-white transition-colors duration-150 hover:bg-accent-blue-hover"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
