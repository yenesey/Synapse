'use strict'

const webpack = require('webpack')
const VueLoaderPlugin = require('vue-loader/lib/plugin')

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const HtmlWebpackPlugin = require('html-webpack-plugin')
const WebpackBar = require('webpackbar')

//const HardSourceWebpackPlugin = require('hard-source-webpack-plugin')
// const VuetifyLoaderPlugin = require('vuetify-loader/lib/plugin')

const resolve = (...dirs) => require('path').join(...[__dirname, '..', ...dirs]  )

var config = {

	entry: {
		synapse: ['@/main.js']
	},

	output: {
		path: resolve('client'),
		filename: '[name].js',
		publicPath: '/'
	},

	resolve : {
		alias : {
			'@': resolve('client_source'),
			'hmr$': 'webpack-hot-middleware/client.js',
			'lib$': resolve('core/lib.js'),
			'vue$': 'vue/dist/vue.common.js',
			'vue-router$': 'vue-router/dist/vue-router.common.js',
			'vuetify$': 'vuetify/dist/vuetify.min.js',
		}
	},

	stats: {
		children: false
	},

	module: {
		rules: [
			{
				test: /\.pug$/,
				loader: 'pug-plain-loader'
			},
			{
				test: /\.vue$/,
				use: 'vue-loader'
			},
			{
				exclude: /node_modules|core/,
				test: /\.js$/,
				use: {
					loader: 'babel-loader',
					options: {
						cacheDirectory: true,
						presets: [
							['@babel/preset-env', {
								useBuiltIns: 'entry', // 'usage'
								corejs: 3,
								// include: ['es.promise', 'es.string.starts-with', 'es.math.cbrt', 'es.symbol']
							}]
						]
					}
				}
			},
			{
				test: /\.(sa|sc|c)ss$/,
				use: ['vue-style-loader', 'css-loader', 'sass-loader']
			},
			{
				test: /\.(png|jpg|gif|svg|woff|woff2|eot|ttf)$/,
				use: {
					loader: 'url-loader',
					options: {
						limit: 160000,
						name: '[name].[ext]?[hash]'
					}
				}
			}
		]
	},

	mode: 'development',
	devtool: 'source-map',

	plugins: [
		// new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /^\.\/(ru)$/), //--берем только русскую локаль
		new HtmlWebpackPlugin({
			inject: true,
			favicon:  resolve('client_source/assets', 'favicon.ico'),
			template: resolve('client_source/assets', 'index.html')
		}),
		new VueLoaderPlugin(),
		// new VuetifyLoaderPlugin(),
		new webpack.DefinePlugin({
			'baseUrl': JSON.stringify(process.env.BASE_URL || '')
		}),
		new WebpackBar({ minimal: false })
//		new HardSourceWebpackPlugin()
	],

	optimization: {
		splitChunks: {
			// chunks: 'all',
			cacheGroups: {
				vendors: {
					test: /node_modules/,
					priority: -10,
					name: 'vendors',
					chunks: 'initial'
				}
			}
		}
	}
}

if (process.env.NODE_ENV === 'production') {
	config.mode = 'production' // 'none'
	config.devtool = ''
	if (process.env.npm_config_report)
		config.plugins.push(new BundleAnalyzerPlugin({ analyzerMode: 'static' }))

} else { // dev mode by default
	config.plugins.push(new webpack.HotModuleReplacementPlugin())
	config.entry.synapse.unshift('@/hmr-iexplore')
}

module.exports = config
