// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import * as KeyChain from 'react-native-keychain';

import DatabaseManager from '@database/manager';
import {logWarning} from '@utils/log';
import {getIOSAppGroupDetails} from '@utils/mattermost_managed';

export const getAllServerCredentials = async (): Promise<ServerCredential[]> => {
    const serverCredentials: ServerCredential[] = [];

    let serverUrls: string[];
    if (Platform.OS === 'ios') {
        serverUrls = await KeyChain.getAllInternetPasswordServers();
    } else {
        serverUrls = await KeyChain.getAllGenericPasswordServices();
    }

    for await (const serverUrl of serverUrls) {
        const serverCredential = await getServerCredentials(serverUrl);

        if (serverCredential) {
            serverCredentials.push(serverCredential);
        }
    }

    return serverCredentials;
};

export const getActiveServerUrl = async () => {
    let serverUrl = await DatabaseManager.getActiveServerUrl();
    if (!serverUrl) {
        let serverUrls: string[];
        if (Platform.OS === 'ios') {
            serverUrls = await KeyChain.getAllInternetPasswordServers();
        } else {
            serverUrls = await KeyChain.getAllGenericPasswordServices();
        }

        serverUrl = serverUrls[0];
    }
    return serverUrl || undefined;
};

export const setServerCredentials = async (serverUrl: string, token: string, preauthSecret?: string) => {
    if (!(serverUrl && token)) {
        return;
    }

    let accessGroup: string | undefined;
    if (Platform.OS === 'ios') {
        try {
            const appGroup = getIOSAppGroupDetails();
            accessGroup = appGroup.appGroupIdentifier;
        } catch {
            // App Group unavailable (sideloaded app)
        }
    }

    const baseOptions: KeyChain.SetOptions = {
        securityLevel: KeyChain.SECURITY_LEVEL.SECURE_SOFTWARE,
    };

    // Try with access group first, fall back to without for sideloaded apps
    let stored = false;
    if (accessGroup) {
        try {
            await KeyChain.setInternetCredentials(serverUrl, token, token, {...baseOptions, accessGroup});
            stored = true;
        } catch {
            // Access group invalid (sideloaded app without entitlement)
        }
    }
    if (!stored) {
        try {
            await KeyChain.setInternetCredentials(serverUrl, token, token, baseOptions);
        } catch (e) {
            logWarning('could not set credentials', e);
        }
    }

    // Store preauth secret
    if (preauthSecret) {
        try {
            await KeyChain.setGenericPassword('preshared_secret', preauthSecret, {
                server: serverUrl,
                ...baseOptions,
            });
        } catch (e) {
            logWarning('could not set preauth secret', e);
        }
    } else {
        try {
            await KeyChain.resetGenericPassword({
                server: serverUrl,
                ...baseOptions,
            });
        } catch {
            // ignore
        }
    }
};

export const removeServerCredentials = async (serverUrl: string) => {
    await KeyChain.resetInternetCredentials({server: serverUrl});
};

export const removePreauthSecret = async (serverUrl: string) => {
    try {
        await KeyChain.resetGenericPassword({server: serverUrl});
    } catch (e) {
        // Preauth secret might not exist, ignore errors
    }
};

export const getPreauthSecret = async (serverUrl: string): Promise<string | undefined> => {
    try {
        const preauthCredentials = await KeyChain.getGenericPassword({
            server: serverUrl,
        });
        const secret = preauthCredentials ? preauthCredentials.password : undefined;
        return secret;
    } catch (e) {
        return undefined;
    }
};

export const removeActiveServerCredentials = async () => {
    const serverUrl = await getActiveServerUrl();
    if (serverUrl) {
        await removeServerCredentials(serverUrl);
    }
};

export const getServerCredentials = async (serverUrl: string): Promise<ServerCredential|null> => {
    try {
        // Get main credentials
        const credentials = await KeyChain.getInternetCredentials(serverUrl);

        if (!credentials) {
            return null;
        }

        // TODO: Pre-Gekidou we were concatenating the deviceToken and the userId in
        // credentials.username so we need to check the length of credentials.username.split(',').
        // This check should be removed at some point. https://mattermost.atlassian.net/browse/MM-43483
        const parts = credentials.username.split(',');
        const userId = parts[parts.length - 1];
        const token = credentials.password;

        if (!token || token === 'undefined') {
            return null;
        }

        // Get preauth secret separately
        let preauthSecret: string | undefined;
        try {
            const preauthCredentials = await KeyChain.getGenericPassword({
                server: serverUrl,
            });
            preauthSecret = preauthCredentials ? preauthCredentials.password : undefined;
        } catch (e) {
            // Preauth secret is optional, so ignore errors
            preauthSecret = undefined;
        }

        return {
            serverUrl,
            userId,
            token,
            preauthSecret,
        };
    } catch (e) {
        return null;
    }
};
