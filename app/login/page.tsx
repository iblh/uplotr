import { LoginForm } from "./LoginForm";
import * as React from "react";

interface LoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage(props: LoginPageProps) {
  const searchParams = await props.searchParams;
  const nextParam = searchParams?.next;
  const requestedPath = Array.isArray(nextParam)
    ? nextParam[0]
    : nextParam || "/app";
  const nextPath = requestedPath.startsWith("/") && !requestedPath.startsWith("//")
    ? requestedPath
    : "/app";

  return <LoginForm nextPath={nextPath} />;
}
