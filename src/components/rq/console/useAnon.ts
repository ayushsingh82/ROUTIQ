"use client";

import { useSyncExternalStore } from "react";
import { anonStore } from "@/lib/anon-rpc/manager";

export const useAnon = () => useSyncExternalStore(anonStore.subscribe, anonStore.getSnapshot, anonStore.getServerSnapshot);
