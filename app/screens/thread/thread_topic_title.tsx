// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    topic: string;
    channelName: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        ...Platform.select({
            android: {marginRight: 16},
        }),
    },
    topicText: {
        color: theme.sidebarHeaderTextColor,
        ...typography('Heading', 200),
    },
    row2: {
        flexDirection: 'row' as const,
        justifyContent: 'flex-end' as const,
        alignItems: 'center' as const,
        marginTop: 2,
    },
    channelBadge: {
        backgroundColor: changeOpacity(theme.sidebarHeaderTextColor, 0.16),
        borderRadius: 4,
    },
    channelNameText: {
        color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
        ...typography('Body', 25, 'SemiBold'),
        letterSpacing: 0.1,
        textTransform: 'uppercase' as const,
        marginHorizontal: 6,
        marginVertical: 2,
    },
}));

function ThreadTopicTitle({topic, channelName}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <Text
                numberOfLines={1}
                style={styles.topicText}
                ellipsizeMode='tail'
            >
                {topic}
            </Text>
            {Boolean(channelName) && (
                <View style={styles.row2}>
                    <View style={styles.channelBadge}>
                        <Text
                            numberOfLines={1}
                            style={styles.channelNameText}
                        >
                            {channelName}
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}

export default ThreadTopicTitle;
