/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { LoadedSettings, SettingScope } from '../../config/settings.js';
import {
  AuthType,
  Config,
  clearCachedCredentialFile,
  getErrorMessage,
  shouldAttemptBrowserLaunch,
} from '@google/gemini-cli-core';
import { runExitCleanup } from '../../utils/cleanup.js';

export const useAuthCommand = (
  settings: LoadedSettings,
  setAuthError: (error: string | null) => void,
  config: Config,
) => {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(
    settings.merged.selectedAuthType === undefined,
  );
  const [pendingAuthType, setPendingAuthType] = useState<AuthType | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);

  const openAuthDialog = useCallback(() => {
    setIsAuthDialogOpen(true);
  }, []);

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const authFlow = async () => {
      const authType = settings.merged.selectedAuthType;
      if (isAuthDialogOpen || !authType || needsApiKey) {
        return;
      }

      // Check if we need API key for OpenRouter or Custom API
      if (
        (authType === AuthType.USE_OPENROUTER && !process.env.OPENROUTER_API_KEY) ||
        (authType === AuthType.USE_CUSTOM_API && !process.env.CUSTOM_API_KEY)
      ) {
        setPendingAuthType(authType);
        setNeedsApiKey(true);
        return;
      }

      try {
        setIsAuthenticating(true);
        await config.refreshAuth(authType);
        console.log(`Authenticated via "${authType}".`);
      } catch (e) {
        setAuthError(`Failed to login. Message: ${getErrorMessage(e)}`);
        openAuthDialog();
      } finally {
        setIsAuthenticating(false);
      }
    };

    void authFlow();
  }, [isAuthDialogOpen, settings, config, setAuthError, openAuthDialog, needsApiKey]);

  const handleAuthSelect = useCallback(
    async (authType: AuthType | undefined, scope: SettingScope) => {
      if (authType) {
        await clearCachedCredentialFile();
        settings.setValue(scope, 'selectedAuthType', authType);
        if (
          authType === AuthType.LOGIN_WITH_GOOGLE &&
          (config.getNoBrowser() || !shouldAttemptBrowserLaunch())
        ) {
          runExitCleanup();
          console.log(
            `
----------------------------------------------------------------
Logging in with Google... Please restart Gemini CLI to continue.
----------------------------------------------------------------
            `,
          );
          process.exit(0);
        }
      }
      setIsAuthDialogOpen(false);
      setAuthError(null);
    },
    [settings, setAuthError, config],
  );

  const cancelAuthentication = useCallback(() => {
    setIsAuthenticating(false);
  }, []);

  const handleApiKeySubmit = useCallback(
    async (apiKey: string) => {
      if (!pendingAuthType) return;

      // Set the API key in environment
      if (pendingAuthType === AuthType.USE_OPENROUTER) {
        process.env.OPENROUTER_API_KEY = apiKey;
      } else if (pendingAuthType === AuthType.USE_CUSTOM_API) {
        process.env.CUSTOM_API_KEY = apiKey;
      }

      setNeedsApiKey(false);
      setPendingAuthType(null);

      // Now proceed with authentication
      try {
        setIsAuthenticating(true);
        await config.refreshAuth(pendingAuthType);
        console.log(`Authenticated via "${pendingAuthType}".`);
      } catch (e) {
        setAuthError(`Failed to login. Message: ${getErrorMessage(e)}`);
        openAuthDialog();
      } finally {
        setIsAuthenticating(false);
      }
    },
    [pendingAuthType, config, openAuthDialog, setAuthError],
  );

  const handleApiKeyCancel = useCallback(() => {
    setNeedsApiKey(false);
    setPendingAuthType(null);
    openAuthDialog();
  }, [openAuthDialog]);

  return {
    isAuthDialogOpen,
    openAuthDialog,
    handleAuthSelect,
    isAuthenticating,
    cancelAuthentication,
    needsApiKey,
    pendingAuthType,
    handleApiKeySubmit,
    handleApiKeyCancel,
  };
};
