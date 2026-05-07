// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableHighlight, View} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import {fetchAndSwitchToThread} from '@actions/remote/thread';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import FriendlyDate from '@components/friendly_date';
import ProfilePicture from '@components/profile_picture';
import RemoveMarkdown from '@components/remove_markdown';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {usePreventDoubleTap} from '@hooks/utils';
import {bottomSheetModalOptions, showModal, showModalOverCurrentContext} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type ThreadModel from '@typings/database/models/servers/thread';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    author?: UserModel;
    channel?: ChannelModel;
    location: AvailableScreens;
    post?: PostModel;
    teammateNameDisplay: string;
    testID: string;
    thread: ThreadModel;
    isChannelAutotranslated: boolean;
    lastReplyPost?: PostModel;
    lastReplyAuthor?: UserModel;
};

// Extract topic from root post message.
// Supports all plugin formats:
//   [ topic ]\n\noriginal      — current bracket format
//   [ topic ]:original         — bracket without \n\n separator
//   **📌 topic**\n\noriginal   — v0.2.0 pin format
//   ** topic**\n\noriginal     — generic bold format
//   <!-- thread-topic -->...   — v0.1.0 legacy
export function extractTopic(message: string): {topic: string; original: string} {
    // Strategy 1: Try \n\n separator first
    const nlIdx = message.indexOf('\n\n');
    if (nlIdx !== -1) {
        const topicLine = message.substring(0, nlIdx);
        const original = message.substring(nlIdx + 2);

        // [topic]
        const bm = topicLine.match(/^\[\s*(.+?)\s*\]$/);
        if (bm) {
            return {topic: bm[1], original};
        }

        // **📌 topic**
        const pm = topicLine.match(/^\*\*📌\s*(.+?)\*\*$/);
        if (pm) {
            return {topic: pm[1], original};
        }

        // **topic**
        const boldm = topicLine.match(/^\*\*\s*(.+?)\s*\*\*$/);
        if (boldm) {
            return {topic: boldm[1], original};
        }

        // <!-- thread-topic -->...
        if (topicLine.includes('<!-- thread-topic -->')) {
            let t = topicLine.replace('<!-- thread-topic -->', '').trim();
            t = t.replace(/^\*\*📌\s*/, '').replace(/\*\*$/, '').trim();
            if (t) {
                return {topic: t, original};
            }
        }
    }

    // Strategy 2: No \n\n — try matching [topic] at the start of the message
    const bracketStart = message.match(/^\[\s*(.+?)\s*\]([\s:]*)([\s\S]*)$/);
    if (bracketStart) {
        return {topic: bracketStart[1], original: bracketStart[3]};
    }

    // Strategy 3: Try **📌 topic** at the start without \n\n
    const pinStart = message.match(/^\*\*📌\s*(.+?)\*\*([\s:]*)([\s\S]*)$/);
    if (pinStart) {
        return {topic: pinStart[1], original: pinStart[3]};
    }

    // Strategy 4: Try **topic** at the start without \n\n
    const boldStart = message.match(/^\*\*\s*(.+?)\s*\*\*([\s:]*)([\s\S]*)$/);
    if (boldStart) {
        return {topic: boldStart[1], original: boldStart[3]};
    }

    return {topic: '', original: message};
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            paddingTop: 12,
            paddingRight: 16,
            paddingBottom: 10,
            flex: 1,
            flexDirection: 'row',
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderBottomWidth: 1,
        },
        badgeContainer: {
            marginTop: 3,
            width: 26,
        },
        postContainer: {
            flex: 1,
        },
        // Line 1: Topic
        topicText: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'SemiBold'),
            marginBottom: 4,
        },
        // Line 2-3: Reply/content with avatar
        replyRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: 6,
        },
        replyAvatar: {
            marginRight: 6,
            marginTop: 2,
        },
        replyContent: {
            flex: 1,
        },
        replyText: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            ...typography('Body', 100),
        },
        // Line 4: Footer — channel + replies + time (right-aligned)
        footer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        channelNameContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderRadius: 4,
            maxWidth: '40%',
        },
        channelName: {
            color: theme.centerChannelColor,
            ...typography('Body', 25, 'SemiBold'),
            letterSpacing: 0.1,
            textTransform: 'uppercase',
            marginHorizontal: 6,
            marginVertical: 2,
        },
        footerMeta: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            ...typography('Body', 50),
            marginLeft: 8,
        },
        footerMetaUnread: {
            color: theme.sidebarTextActiveBorder,
            ...typography('Body', 50, 'SemiBold'),
            marginLeft: 8,
        },
        footerSpacer: {
            flex: 1,
        },
        footerTime: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            ...typography('Body', 50),
        },
        // Badge styles
        unreadDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.sidebarTextActiveBorder,
            alignSelf: 'center',
            marginTop: 5,
        },
        mentionBadge: {
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: theme.buttonBg,
            alignSelf: 'center',
        },
        mentionBadgeText: {
            ...typography('Body', 25, 'SemiBold'),
            alignSelf: 'center',
            color: theme.buttonColor,
        },
        threadDeleted: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            fontStyle: 'italic',
        },
    };
});

const Thread = ({author, channel, location, post, teammateNameDisplay, testID, thread, isChannelAutotranslated, lastReplyPost, lastReplyAuthor}: Props) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const [isChannelNamePressed, setIsChannelNamePressed] = useState<Boolean>(false);

    const channelNameStyle = useMemo(() => (
        [styles.channelName, isChannelNamePressed ? {color: theme.buttonBg} : null]
    ), [isChannelNamePressed, styles, theme]);

    const togglePressed = useCallback(() => {
        setIsChannelNamePressed((prevState) => !prevState);
    }, []);

    const showThread = usePreventDoubleTap(useCallback(() => {
        fetchAndSwitchToThread(serverUrl, thread.id);
    }, [serverUrl, thread.id]));

    const onChannelNamePressed = useCallback(() => {
        if (channel?.id) {
            switchToChannelById(serverUrl, channel?.id);
        }
    }, [serverUrl, channel?.id]);

    const showThreadOptions = useCallback(() => {
        const passProps = {thread};
        const title = isTablet ? intl.formatMessage({id: 'thread.options.title', defaultMessage: 'Thread Actions'}) : '';

        if (isTablet) {
            showModal(Screens.THREAD_OPTIONS, title, passProps, bottomSheetModalOptions(theme, 'close-thread-options'));
        } else {
            showModalOverCurrentContext(Screens.THREAD_OPTIONS, passProps);
        }
    }, [intl, isTablet, theme, thread]);

    if (!post || !channel) {
        return null;
    }

    const threadItemTestId = `${testID}.thread_item.${thread.id}`;

    // --- Deleted post ---
    if (post.deleteAt > 0) {
        return (
            <TouchableHighlight
                underlayColor={changeOpacity(theme.buttonBg, 0.08)}
                onLongPress={showThreadOptions}
                onPress={showThread}
                testID={threadItemTestId}
            >
                <View style={styles.container}>
                    <View style={styles.badgeContainer}/>
                    <View style={styles.postContainer}>
                        <FormattedText
                            id='threads.deleted'
                            defaultMessage='Original Message Deleted'
                            style={[styles.topicText, styles.threadDeleted]}
                            numberOfLines={1}
                        />
                    </View>
                </View>
            </TouchableHighlight>
        );
    }

    // --- Extract topic from root post ---
    const {topic, original} = extractTopic(post.message);
    const topicDisplay = topic || original.substring(0, 80) || '(no message)';

    // --- Content for lines 2-3: prefer last reply, fallback to root post original ---
    const replyMessage = lastReplyPost?.message;
    const contentMessage = replyMessage || original;
    const contentAuthor = replyMessage ? lastReplyAuthor : author;

    // --- Badge (unread dot / mention count) ---
    const needBadge = thread.unreadMentions || thread.unreadReplies;
    let badgeComponent;
    if (needBadge) {
        if (thread.unreadMentions) {
            badgeComponent = (
                <View style={styles.mentionBadge}>
                    <Text style={styles.mentionBadgeText}>{thread.unreadMentions > 99 ? '99+' : thread.unreadMentions}</Text>
                </View>
            );
        } else {
            badgeComponent = (
                <View style={styles.unreadDot}/>
            );
        }
    }

    // --- Reply count text ---
    const replyCountStyle = thread.unreadReplies ? styles.footerMetaUnread : styles.footerMeta;

    return (
        <TouchableHighlight
            underlayColor={changeOpacity(theme.buttonBg, 0.08)}
            onLongPress={showThreadOptions}
            onPress={showThread}
            testID={threadItemTestId}
        >
            <View style={styles.container}>
                <View style={styles.badgeContainer}>
                    {badgeComponent}
                </View>
                <View style={styles.postContainer}>
                    {/* Line 1: Topic */}
                    <Text
                        style={styles.topicText}
                        numberOfLines={1}
                        testID={`${threadItemTestId}.topic`}
                    >
                        {topic ? `📌 ${topicDisplay}` : topicDisplay}
                    </Text>

                    {/* Line 2-3: Content with avatar (last reply or root post fallback) */}
                    {contentMessage ? (
                        <View style={styles.replyRow}>
                            <View style={styles.replyAvatar}>
                                <ProfilePicture
                                    author={contentAuthor}
                                    size={20}
                                    showStatus={false}
                                />
                            </View>
                            <View style={styles.replyContent}>
                                <Text numberOfLines={2}>
                                    <RemoveMarkdown
                                        enableCodeSpan={true}
                                        enableEmoji={true}
                                        enableChannelLink={true}
                                        enableHardBreak={true}
                                        enableSoftBreak={true}
                                        baseStyle={styles.replyText}
                                        value={contentMessage.substring(0, 150)}
                                    />
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    {/* Line 4: Footer — channel | replies | spacer | time (right-aligned) */}
                    <View style={styles.footer}>
                        <View style={styles.channelNameContainer}>
                            <TouchableWithFeedback
                                onPress={onChannelNamePressed}
                                type={'native'}
                                underlayColor={changeOpacity(theme.buttonBg, 0.08)}
                                onPressIn={togglePressed}
                                onPressOut={togglePressed}
                            >
                                <Text
                                    style={channelNameStyle}
                                    numberOfLines={1}
                                >
                                    {channel?.displayName}
                                </Text>
                            </TouchableWithFeedback>
                        </View>
                        {thread.replyCount > 0 && (
                            <FormattedText
                                id='threads.replies'
                                defaultMessage='{count} {count, plural, one {reply} other {replies}}'
                                style={replyCountStyle}
                                values={{count: thread.replyCount}}
                            />
                        )}
                        <View style={styles.footerSpacer}/>
                        <FriendlyDate
                            value={thread.lastReplyAt}
                            style={styles.footerTime}
                        />
                    </View>
                </View>
            </View>
        </TouchableHighlight>
    );
};

export default Thread;
