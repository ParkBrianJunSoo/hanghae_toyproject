const express = require('express');
const router = express.Router();
const authMiddleware = require("../middlewares/auth-middleware.js");
const Posts = require('../schemas/post.js');
const uploadImage = require('../modules/s3.js');



// 게시글 생성 : POST -> localhost:3000/posts
router.post('/', authMiddleware, uploadImage.single('photo'), async (req, res) => {
    try {
        const { userId, nickname } = res.locals.user;
        const { title, content } = req.body;
        const { photo_ip } = req;
        await Posts.create({ userId, nickname, title, content, photo_ip });
        return res.status(200).json({ message: '게시글 작성에 성공하였습니다.' })
    } catch {
        return res.status(416).json({ message: '데이터 형식이 올바르지 않습니다.' });
    }
});

// const post = await (Posts.find()).sort("-createdAt"); 사용 시 MongoDB 내부 기능으로 mongoose 외 일반 배열에서는 동작 안 된다고 함

// 게시글 조회 : GET -> localhost:3000/posts
router.get('/', async (req, res) => {
    try {
        const post = await (Posts.find()).sort("-createdAt");   // 내림차순 방법 1
        // console.log(post);
        const results = post.map((item) => {
            return {
                postId: item.postId,
                userId: item.userId,
                nickname: item.nickname,
                title: item.title,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                photo_ip : item.photo_ip,
            };
        }).sort((a, b) => {
            return b.createdAt.getTime() - a.createdAt.getTime();
        }); // 내림차순 방법 2 ( 둘 중 하나를 해도 먹힘, 배열 유무 차이라지만 둘다 배열 내 객체... 아직 차이 잘 모르겠음 )
        // console.log(results);
        res.json({ data: results });
    } catch (err) {
        console.error(err);
        res.status(400).send({ message: '게시글 조회에 실패하였습니다.' });
    }
});


// 게시글 상세조회 : GET -> localhost:3000/posts/:postId
router.get('/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await Posts.findOne({_id:postId});
        const result = {
            postId: post.postId,
            userId: post.userId,
            nickname: post.nickname,
            title: post.title,
            content: post.content,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt
        };
        res.json({ data: result });
    } catch (err) {
        console.error(err);
        res.status(400).send({ message: '게시글 조회에 실패하였습니다.' });
    }
});

// 게시글 검색 조회
router.get('/search/:keyword', async (req, res) => {
	let result = await Posts.find({ title: { $regex: req.params.keyword } });
	return res.status(200).json({ data: result });
});


// 게시글 수정 : PUT -> localhost:3000/posts/:postId
router.put('/:postId', authMiddleware, async (req, res) => {
    try {
        const { userId } = res.locals.user;
        const { postId } = req.params;
        const { title, content } = req.body;

        const [post] = await Posts.find({ _id: postId });
        
        if (title.length===0) {
            return res.status(410).json({ errorMessage: "게시글 제목의 형식이 일치하지 않습니다."})
        }
        if (content.length===0) {
            return res.status(410).json({ errorMessage: "게시글 내용의 형식이 일치하지 않습니다."})
        }
        if (userId === post.userId) {
            const date = new Date();
            await Posts.updateOne({ _id: postId }, { $set: { title: title, content: content, updatedAt: date } })
            return res.status(200).json({ message: '게시글을 수정하였습니다.' });
        } else {
            return res.status(414).json({ errorMessage: '게시글 수정의 권한이 존재하지 않습니다.' });
        }
    } catch (err) {
        console.error(err);
        res.status(400).send({ errorMessage: '게시글 수정에 실패하였습니다.' });
    }
});


// 게시글 삭제 : DELETE -> localhost:3000/posts/:postId
router.delete('/:postId', authMiddleware, async (req, res) => {
    try {
        const { userId } = res.locals.user;
        const { postId } = req.params;
        
        const post = await Posts.findOne({ _id: postId });

        if (!post) {
            return res.status(412).json({ message: '게시글이 존재하지 않습니다.' });
        }
        
        if (userId === post.userId) {
            await Posts.deleteOne({ _id: postId })
            return res.status(200).json({ message: '게시글을 삭제하였습니다.' });
        } else {
            return res.status(414).json({ errorMessage: '게시글의 삭제 권한이 존재하지 않습니다.' });
        }
    } catch (err) {
        console.error(err);
        return res.status(415).send({ errorMessage: '게시글 삭제에 실패하였습니다.' });
    }
});



module.exports = router;