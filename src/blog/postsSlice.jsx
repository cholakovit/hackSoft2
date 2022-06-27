import { createSlice, createAsyncThunk, createSelector, createEntityAdapter, current } from "@reduxjs/toolkit"
import { sub } from 'date-fns';
import axios from "axios";

const POSTS_URL = 'http://localhost:3500/posts'
const USERS_URL = 'http://localhost:3500/users'

//import zzz from '../../data/data.json'

const postsAdapter = createEntityAdapter({
    sortComparer: (a, b) => b.date.localeCompare(a.date)
})

const initialState = postsAdapter.getInitialState({
    status: 'idle', //'idle' | 'loading' | 'succeeded' | 'failed'
    posts: [],
    user: null,
    userStatus: 'idle', //'idle' | 'loading' | 'succeeded' | 'failed'
    postStatus: 'idle', //'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    count: 0
})

export const selectPostById = createAsyncThunk('posts/showPost', async (postId) => {
    const post = await axios.get(`${POSTS_URL}/${postId}`)
    const user = await axios.get(`${USERS_URL}/${post.data.userId}`)

    post.data.name = user.data.name
    post.data.position = user.data.position
    post.data.pic = user.data.pic

    return post.data
})

export const selectUserById = createAsyncThunk('posts/showUser', async (userId) => {
    const user = await axios.get(`${USERS_URL}/${userId}`)
    return user.data
})

export const fetchPosts = createAsyncThunk('posts/fetchPosts', async (loadMore) => {
    const posts = await axios.get(POSTS_URL+`?_limit=${loadMore}`)
    //const posts = await axios.get(POSTS_URL)
    const users = await axios.get(USERS_URL)

    console.log('POSTS_URL', loadMore)

    // експоненциално изменение
    // users.data.map(user => {
    //     posts.data.map(post => {
    //         if(post.userId == user.id) { 
    //             post.name = user.name
    //             post.position = user.position
    //             post.pic = user.pic
    //         }
    //     })
    // })

    // линейно изменение
    const userArr = Object.fromEntries(users.data.map(
            (user) => ([user.id, user])
        )
    )

    posts.data.map(post => {
        post.name = userArr[post.userId].name
        post.position = userArr[post.userId].position
        post.pic = userArr[post.userId].pic
    })

    return posts.data
})

export const addNewPost = createAsyncThunk('posts/addNewPost', async (initialPost) => {
    const response = await axios.post(POSTS_URL, initialPost)
    return response.data
})

export const updatePost = createAsyncThunk('posts/updatePost', async (post) => {
    const { id } = post
    console.log('updatePost id', post)
    try {
        const response = await axios.put(`${POSTS_URL}/${id}`, post)
        return response.data
    } catch (err) {
        return err.message
    }
})

export const updateUser = createAsyncThunk('posts/updateUser', async (user) => {
    const { id } = user;
    try {
        const response = await axios.put(`${USERS_URL}/${id}`, user)
        return response.data
    } catch (err) {
        return err.message
    }
})

const postsSlice = createSlice({
    name: 'posts',
    initialState,
    reducers: {},
    extraReducers(builder) {
        builder
            .addCase(fetchPosts.pending, (state, action) => {
                state.status = 'loading'
            })
            .addCase(fetchPosts.fulfilled, (state, action) => {
                state.status = 'succeeded'
                state.posts = action.payload
                console.log('fetchPosts.fulfilled', action.payload)
            })
            .addCase(fetchPosts.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })
            .addCase(addNewPost.fulfilled, (state, action) => {
                action.payload.userId = Number(action.payload.userId)
                action.payload.date = new Date().toISOString();
                action.payload.reactions = {
                    likes: 0,
                    shares: 0
                }
            })
            .addCase(selectPostById.fulfilled, (state, action) => {
                state.post = action.payload
                state.postStatus = 'succeeded'
            })
            .addCase(selectUserById.fulfilled, (state, action) => {
                state.user = action.payload
                state.userStatus = 'succeeded'
            })
            .addCase(updateUser.fulfilled, (state, action) => {
                if (!action.payload?.id) {
                    console.log('Update could not complete')
                    console.log(action.payload)
                    return;
                }
                action.payload.date = new Date().toISOString()
            })
            .addCase(updatePost.fulfilled, (state, action) => {
                if (!action.payload?.id) {
                    console.log('Update could not complete')
                    console.log(action.payload)
                    return;
                }
                state.posts[action.payload.id].reactions['like']++
            })
    }
})

export const getPosts = (state) => state.posts.posts
export const getPostsStatus = (state) => state.posts.status
export const getPostsError = (state) => state.posts.error

export const getUserById = (state) => state.posts.user
export const getUserStatus = (state) => state.posts.userStatus

export const getPostById = (state) => state.posts.post
export const getPostStatus = (state) => state.posts.postStatus

export default postsSlice.reducer