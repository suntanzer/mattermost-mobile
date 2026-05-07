// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, type StyleProp, type ViewStyle} from 'react-native';

import {createPost} from '@actions/remote/post';
import {useServerUrl} from '@context/server';

import BANG_COMMANDS, {type BangCommand} from './bang_commands';
import BangSuggestionItem from './bang_suggestion_item';

// This character is inserted by the / button to trigger the quick command list
export const QUICK_CMD_TRIGGER = '\x01';

type Props = {
    channelId: string;
    rootId?: string;
    value: string;
    updateValue: (text: string) => void;
    onShowingChange: (showing: boolean) => void;
    nestedScrollEnabled?: boolean;
    listStyle: StyleProp<ViewStyle>;
};

const emptyList: BangCommand[] = [];

const keyExtractor = (item: BangCommand) => item.trigger;

const BangSuggestion = ({
    channelId,
    rootId,
    value,
    updateValue,
    onShowingChange,
    nestedScrollEnabled,
    listStyle,
}: Props) => {
    const serverUrl = useServerUrl();
    const [dataSource, setDataSource] = useState<BangCommand[]>(emptyList);

    const active = dataSource.length > 0;

    useEffect(() => {
        // Trigger on the special character inserted by the / button
        if (!value.startsWith(QUICK_CMD_TRIGGER)) {
            setDataSource(emptyList);
            onShowingChange(false);
            return;
        }

        const matchTerm = value.substring(1).toLowerCase().trim();
        const filtered = BANG_COMMANDS.filter((cmd) => {
            if (!matchTerm) {
                return true;
            }
            return cmd.trigger.toLowerCase().includes(matchTerm) ||
                cmd.message.toLowerCase().includes(matchTerm);
        });

        setDataSource(filtered);
        onShowingChange(filtered.length > 0);
    }, [value, onShowingChange]);

    const handleSelect = useCallback((message: string) => {
        // Send the command message directly
        const post: Partial<Post> = {
            channel_id: channelId,
            message,
            root_id: rootId || '',
        };
        createPost(serverUrl, post);

        // Clear the input
        updateValue('');
    }, [serverUrl, channelId, rootId, updateValue]);

    const renderItem = useCallback(({item}: {item: BangCommand}) => (
        <BangSuggestionItem
            trigger={item.trigger}
            hint={item.hint}
            description={item.description}
            message={item.message}
            onPress={handleSelect}
        />
    ), [handleSelect]);

    if (!active) {
        return null;
    }

    return (
        <FlatList
            keyboardShouldPersistTaps='always'
            style={listStyle}
            data={dataSource}
            keyExtractor={keyExtractor}
            removeClippedSubviews={true}
            renderItem={renderItem}
            nestedScrollEnabled={nestedScrollEnabled}
            testID='autocomplete.bang_suggestion.flat_list'
        />
    );
};

export default BangSuggestion;
