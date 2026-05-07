// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';
import {observeChannel, observeIsChannelAutotranslated} from '@queries/servers/channel';
import {observePost} from '@queries/servers/post';
import {observeUser} from '@queries/servers/user';

import Thread from './thread';

import type PostModel from '@typings/database/models/servers/post';
import type {WithDatabaseArgs} from '@typings/database/database';
import type ThreadModel from '@typings/database/models/servers/thread';

const {SERVER: {POST}} = MM_TABLES;

const enhanced = withObservables([], ({database, thread}: WithDatabaseArgs & {thread: ThreadModel}) => {
    const post = observePost(database, thread.id);

    // Observe the most recent reply — wrapped with catchError to handle DB corruption gracefully
    const lastReplyPost = database.get<PostModel>(POST).query(
        Q.where('root_id', thread.id),
        Q.where('delete_at', Q.eq(0)),
        Q.sortBy('create_at', Q.desc),
        Q.take(1),
    ).observe().pipe(
        catchError(() => of$([] as PostModel[])),
        switchMap((posts) => (posts.length ? posts[0].observe().pipe(catchError(() => of$(undefined))) : of$(undefined))),
    );

    const lastReplyAuthor = lastReplyPost.pipe(
        switchMap((p) => (p?.userId ? observeUser(database, p.userId) : of$(undefined))),
        catchError(() => of$(undefined)),
    );

    return {
        post,
        thread: thread.observe(),
        channel: post.pipe(
            switchMap((p) => (p?.channelId ? observeChannel(database, p.channelId) : of$(undefined))),
        ),
        author: post.pipe(
            switchMap((u) => (u?.userId ? observeUser(database, u.userId) : of$(undefined))),
        ),
        isChannelAutotranslated: post.pipe(
            switchMap((p) => (p?.channelId ? observeIsChannelAutotranslated(database, p.channelId) : of$(undefined))),
        ),
        lastReplyPost,
        lastReplyAuthor,
    };
});

export default withDatabase(enhanced(Thread));
