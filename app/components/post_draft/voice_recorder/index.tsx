// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

import {createPost} from '@actions/remote/post';
import {uploadFile} from '@actions/remote/file';
import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {hasMicrophonePermission} from '@calls/actions/permissions';
import {deleteFile as deleteLocalFile} from '@utils/file';
import {generateId} from '@utils/general';
import {changeOpacity} from '@utils/theme';

type Props = {
    channelId: string;
    rootId?: string;
    onClose: () => void;
}

const audioRecorderPlayer = new AudioRecorderPlayer();

function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function VoiceRecorder({channelId, rootId, onClose}: Props) {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const [duration, setDuration] = useState(0);
    const [sending, setSending] = useState(false);
    const stoppedRef = useRef(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        startRecording();
        return () => {
            mountedRef.current = false;
            // Only stop if not already stopped by send/cancel
            if (!stoppedRef.current) {
                stoppedRef.current = true;
                audioRecorderPlayer.stopRecorder().then((path) => {
                    if (path) {
                        deleteLocalFile(path);
                    }
                }).catch(() => {});
                audioRecorderPlayer.removeRecordBackListener();
            }
        };
    }, []);

    const startRecording = useCallback(async () => {
        const hasPermission = await hasMicrophonePermission();
        if (!hasPermission) {
            Alert.alert('Permission Denied', 'Microphone permission is required to record voice messages.');
            onClose();
            return;
        }

        try {
            stoppedRef.current = false;
            await audioRecorderPlayer.startRecorder();
            audioRecorderPlayer.addRecordBackListener((e) => {
                if (mountedRef.current) {
                    setDuration(e.currentPosition);
                }
            });
        } catch (error) {
            console.warn('Failed to start recording:', error);
            onClose();
        }
    }, [onClose]);

    const handleCancel = useCallback(() => {
        if (stoppedRef.current) {
            onClose();
            return;
        }
        stoppedRef.current = true;
        audioRecorderPlayer.stopRecorder().then((path) => {
            if (path) {
                deleteLocalFile(path);
            }
        }).catch(() => {});
        audioRecorderPlayer.removeRecordBackListener();
        onClose();
    }, [onClose]);

    const handleSend = useCallback(async () => {
        if (sending || stoppedRef.current) {
            return;
        }
        stoppedRef.current = true;
        setSending(true);

        let localPath = '';
        try {
            const filePath = await audioRecorderPlayer.stopRecorder();
            audioRecorderPlayer.removeRecordBackListener();

            localPath = filePath;
            const uri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;

            const fileInfo: FileInfo = {
                clientId: generateId(),
                name: `voice_${Date.now()}.m4a`,
                mime_type: 'audio/mp4',
                extension: 'm4a',
                size: 0,
                localPath: uri,
                has_preview_image: false,
                height: 0,
                width: 0,
                user_id: '',
            };

            // Upload file and wait for completion
            const uploadResult = await new Promise<string | null>((resolve) => {
                const result = uploadFile(
                    serverUrl,
                    fileInfo,
                    channelId,
                    () => {},
                    (response) => {
                        try {
                            const data = response?.data;
                            let fileInfos: any[] = [];
                            if (typeof data === 'string') {
                                fileInfos = JSON.parse(data)?.file_infos || [];
                            } else if (data?.file_infos) {
                                fileInfos = data.file_infos;
                            }
                            if (fileInfos.length > 0) {
                                resolve(fileInfos[0].id);
                            } else {
                                resolve(null);
                            }
                        } catch (e) {
                            resolve(null);
                        }
                    },
                    () => resolve(null),
                );

                if ('error' in result) {
                    resolve(null);
                }
            });

            if (uploadResult) {
                await createPost(serverUrl, {
                    channel_id: channelId,
                    message: '[voice]',
                    root_id: rootId || '',
                    file_ids: [uploadResult],
                });
            }
        } catch (error) {
            console.warn('Failed to send voice message:', error);
        }

        // Clean up local recording file
        if (localPath) {
            deleteLocalFile(localPath);
        }

        onClose();
    }, [sending, serverUrl, channelId, rootId, onClose]);

    return (
        <View style={[styles.container, {backgroundColor: theme.centerChannelBg}]}>
            <TouchableWithFeedback
                onPress={handleCancel}
                style={styles.button}
                type='opacity'
            >
                <CompassIcon
                    name='close'
                    size={24}
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                />
            </TouchableWithFeedback>

            <View style={styles.recordingInfo}>
                <View style={[styles.recordingDot, {backgroundColor: '#F44336'}]} />
                <Text style={[styles.durationText, {color: theme.centerChannelColor}]}>
                    {sending ? 'Sending...' : formatDuration(duration)}
                </Text>
            </View>

            <TouchableWithFeedback
                onPress={handleSend}
                disabled={sending}
                style={[styles.sendButton, {backgroundColor: sending ? changeOpacity(theme.buttonBg, 0.5) : theme.buttonBg}]}
                type='opacity'
            >
                <CompassIcon
                    name='send'
                    size={20}
                    color={theme.buttonColor}
                />
            </TouchableWithFeedback>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        paddingHorizontal: 12,
    },
    button: {
        padding: 8,
    },
    recordingInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    durationText: {
        fontSize: 16,
        fontWeight: '600',
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
