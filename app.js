const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const crypto = require('crypto')
const mongoose = require('mongoose')
const multer = require('multer')
const GridFsStorage = require('multer-gridfs-storage')
const Grid = require('gridfs-stream')
const methodOverride = require('method-override')

const app = express()

// Middleware
app.use(bodyParser.json())
app.use(methodOverride('_method'))

app.set('view engine', 'ejs')

// Mongo URI
const mongoURI = 'mongodb://root:toor@ds213209.mlab.com:13209/mongouploads'


// Create Mongo Connection
const conn = mongoose.createConnection(mongoURI)

// Init gfs
let gfs
conn.once('open', () => {
    // Init stream
    gfs = Grid(conn.db, mongoose.mongo)
    gfs.collection('uploads')

})

// Create Storage Engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err)
                }

                const filename = buf.toString('hex') + path.extname(file.originalname)
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                }

                resolve(fileInfo)
            })
        })
    }
})
const upload = multer({ storage })

// @route GET /
// @desc Loads form
app.get('/', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        if (!files || files.length == 0) {
            res.render('index', { files: false })
        } else {
            files.map(file => {
                if (file.contentType === 'image/jpeg' || file.contentType === 'image/jpg') {
                    file.isImage = true
                } else {
                    file.isImage = false
                }
            })

            res.render('index', { files: files })
        }

    })

})

// @route POST /upload
// @desc uploads file to db
app.post('/upload', upload.single('file'), (req, res) => {
    // res.json({ file: req.file })

    res.redirect('/')
})

// @route GET /files
// @desc Display all files in JSON
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        if (!files || files.length == 0) {
            return res.status(404).json({
                err: 'No files exists'
            })
        }

        return res.json(files)
    })
})

// @route GET /files/:filename
// @desc Display a single file in JSON
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (!file) {
            return res.status(404).json({
                err: 'No file exist'
            })
        }

        return res.json(file)
    })
})

// @route GET /images/:filename
// @desc Display all files in JSON
app.get('/images/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (!file) {
            return res.status(404).json({
                err: 'No file exist'
            })
        }

        // Check if the file is image
        if (file.contentType === 'image/jpeg' || file.contentType === 'image/jpg') {
            const readStream = gfs.createReadStream(file.filename)
            readStream.pipe(res)
        } else {
            return res.status(404).json({
                err: 'No an image'
            })
        }

    })
})

// @route DELETE /files/:id
// @desc Delete a file
app.delete('/files/:id', (req, res) => {
    gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
        if (err) {
            return res.status(404).json(err)
        }

        res.redirect('/')
    })
})


const port = process.env.PORT | 5000

app.listen(port, () => console.log(`Server started at port ${port}`))