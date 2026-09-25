"use client";
import React from "react";

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error("[ErrorBoundary]", error, info); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-6 text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mt-1">{this.state.error?.message ?? "Unknown error"}</p>
          <button onClick={() => this.setState({ hasError: false })} className="mt-4 px-4 py-2 border rounded">Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
