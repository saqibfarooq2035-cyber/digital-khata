import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center shadow-sm">
            <p className="text-3xl">⚠️</p>
            <h2 className="mt-2 text-lg font-semibold text-rose-700">Something went wrong</h2>
            <p className="mt-1 text-sm text-rose-600">This page ran into an unexpected error. Try reloading.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
