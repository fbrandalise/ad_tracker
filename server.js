import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use('/ml-api', createProxyMiddleware({
  target: 'https://api.mercadolibre.com',
  changeOrigin: true,
  pathRewrite: { '^/ml-api': '' }
}))

app.use('/ml-auth', createProxyMiddleware({
  target: 'https://auth.mercadolivre.com.br',
  changeOrigin: true,
  pathRewrite: { '^/ml-auth': '' }
}))

app.use(express.static(join(__dirname, 'dist')))

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
