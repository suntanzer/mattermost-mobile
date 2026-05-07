// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as WebBrowser from 'expo-web-browser';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, StyleSheet, View} from 'react-native';

import {createDirectChannel, switchToChannelById} from '@actions/remote/channel';
import Button from '@components/button';
import OptionBox, {OPTIONS_HEIGHT} from '@components/option_box';
import {Events, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {dismissBottomSheet} from '@screens/navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

export type OptionsType = 'all' | 'message';

type Props = {
    isBot?: boolean;
    location?: AvailableScreens;
    type: OptionsType;
    userId: string;
    username: string;
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: OPTIONS_HEIGHT,
        marginBottom: 20,
        width: '100%',
    },
    divider: {
        marginRight: 8,
    },
    icon: {
        fontSize: 24,
        lineHeight: 22,
    },
    singleButton: {
        flexDirection: 'row',
        width: '100%',
    },
    singleContainer: {
        marginBottom: 20,
    },
    fileManagerButton: {
        marginTop: 8,
    },
});

const UserProfileOptions = ({isBot, location, type, userId, username}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const mentionUser = useCallback(async () => {
        await dismissBottomSheet(Screens.USER_PROFILE);
        DeviceEventEmitter.emit(Events.SEND_TO_POST_DRAFT, {location, text: `@${username}`});
    }, [location, username]);

    const openChannel = useCallback(async () => {
        await dismissBottomSheet(Screens.USER_PROFILE);
        const {data} = await createDirectChannel(serverUrl, userId);
        if (data) {
            switchToChannelById(serverUrl, data.id);
        }
    }, [userId, serverUrl]);

    const openFileManager = useCallback(async () => {
        const url = `https://mm.wextralogistics.com/botfm/${userId}/`;
        await dismissBottomSheet(Screens.USER_PROFILE);
        WebBrowser.openBrowserAsync(url, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
    }, [userId]);

    if (type === 'all') {
        return (
            <View style={styles.container}>
                <OptionBox
                    iconName='send'
                    onPress={openChannel}
                    testID='user_profile_options.send_message.option'
                    text={intl.formatMessage({id: 'channel_info.send_a_mesasge', defaultMessage: 'Send a message'})}
                />
                <View style={styles.divider}/>
                <OptionBox
                    iconName='at'
                    onPress={mentionUser}
                    testID='user_profile_options.mention.option'
                    text={intl.formatMessage({id: 'channel_info.mention', defaultMessage: 'Mention'})}
                />
            </View>
        );
    }

    return (
        <View style={styles.singleContainer}>
            <Button
                onPress={openChannel}
                testID='user_profile_options.send_message.option'
                size='lg'
                emphasis='tertiary'
                theme={theme}
                text={intl.formatMessage({id: 'channel_info.send_mesasge', defaultMessage: 'Send message'})}
                iconName='send'
            />
            {isBot && (
                <View style={styles.fileManagerButton}>
                    <Button
                        onPress={openFileManager}
                        testID='user_profile_options.file_manager.option'
                        size='lg'
                        emphasis='tertiary'
                        theme={theme}
                        text='文件管理器'
                        iconName='folder-outline'
                    />
                </View>
            )}
        </View>
    );
};

export default UserProfileOptions;
