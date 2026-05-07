// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        icon: {
            fontSize: 24,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            width: 35,
            height: 35,
            marginRight: 12,
            borderRadius: 4,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 8,
        },
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingBottom: 8,
            overflow: 'hidden',
        },
        suggestionContainer: {
            flex: 1,
        },
        suggestionDescription: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
        suggestionName: {
            fontSize: 15,
            color: theme.centerChannelColor,
            marginBottom: 4,
        },
    };
});

type Props = {
    trigger: string;
    hint: string;
    description: string;
    message: string;
    onPress: (message: string) => void;
};

const BangSuggestionItem = ({
    trigger,
    hint,
    description,
    message,
    onPress,
}: Props) => {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const touchableStyle = useMemo(() => {
        return {marginLeft: insets.left, marginRight: insets.right};
    }, [insets]);

    const handlePress = useCallback(() => {
        onPress(message);
    }, [onPress, message]);

    let displayText = trigger;
    if (hint) {
        displayText += ` ${hint}`;
    }

    return (
        <TouchableWithFeedback
            onPress={handlePress}
            style={touchableStyle}
            underlayColor={changeOpacity(theme.buttonBg, 0.08)}
            testID={`autocomplete.bang_suggestion_item.${trigger}`}
            type={'native'}
        >
            <View style={style.container}>
                <View style={style.icon}>
                    <CompassIcon
                        name='console-line'
                        size={18}
                        color={theme.centerChannelColor}
                    />
                </View>
                <View style={style.suggestionContainer}>
                    <Text
                        style={style.suggestionName}
                    >
                        {displayText}
                    </Text>
                    {Boolean(description) &&
                        <Text
                            ellipsizeMode='tail'
                            numberOfLines={1}
                            style={style.suggestionDescription}
                        >
                            {description}
                        </Text>
                    }
                </View>
            </View>
        </TouchableWithFeedback>
    );
};

export default BangSuggestionItem;
