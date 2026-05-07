// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type StyleProp, View, type ViewStyle} from 'react-native';

import {TYPING_HEIGHT} from '@constants/post_draft';

type Props = {
    visible: boolean;
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const STATUS_INDICATOR_HEIGHT = TYPING_HEIGHT;

function StatusIndicator({
    visible,
    children,
    style,
}: Props) {
    return (
        <View style={[{height: STATUS_INDICATOR_HEIGHT, marginBottom: 4, overflow: 'hidden'}, style]}>
            {visible ? children : null}
        </View>
    );
}

export default React.memo(StatusIndicator);

