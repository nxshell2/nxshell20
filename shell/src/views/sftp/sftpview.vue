<template>
	<div class="pt-sftp-view">
		<file-view :getFs="getFs" :cwd="dir" :hostInfo="hostInfo"></file-view>
		<pt-auth-dialog ref="dialog" @authOk="handleAuthOk" />
	</div>
</template>

<script>
import FileView from '../components/fileview/fileview'
import PtAuthDialog from '../components/auth/auth'

export default {
	name: 'PtSftpView',
	components: {
		FileView,
		PtAuthDialog
	},
	props: {
		mode: {
			type: String,
			default: 'full'
		},
		sessionId: {
			type: Number
		}
	},

	data() {
		return {
			currentDir: '/',
			getFs: null,
			dir: '/',

			hostInfo: {}
		}
	},

	created() {
		this.getFs = async () => {
			const sessionInstance = this.$sessionManager.getSessionInstanceById(this.sessionId)
			if (!sessionInstance) {
				throw new Error('Session not found: ' + this.sessionId)
			}
			return await sessionInstance.getFs()
		}

		const sessionInstance = this.$sessionManager.getSessionInstanceById(this.sessionId)
		if (!sessionInstance) {
			console.error('SFTP session not found:', this.sessionId)
			return
		}
		this.sessionInstance = sessionInstance

		this.sessionInstance.on('control', (data) => {
			this.$refs.dialog?.show(data)
		})

		this.sessionInstance.on('close', () => {
			// Let Vue handle DOM removal
		})

		const config = this.sessionInstance.cfg
		if (!config) {
			console.error('SFTP session config missing:', this.sessionId)
			return
		}

		this.dir = config.sftpDirt || '/'
		this.hostInfo = {
			username: config.username,
			host: config.hostAddress,
			uuid: config.uuid
		}
	},

	methods: {
		handleOpenDir(_dir) {},
		handleAuthOk(data) {
			this.sessionInstance?.sendControlData(data)
		}
	},

	async beforeUnmount() {
		if (typeof this.getFs !== 'function') {
			return
		}
		try {
			let fs = await this.getFs()
			if (fs && typeof fs.dispose === 'function') {
				fs.dispose()
			}
		} catch (e) {
			// session may already be closed
		}
	}
}
</script>

<style lang="scss">
.pt-sftp-view {
	position: relative;
	height: 100%;
	background-color: var(--n-bg-color-base);
}
</style>
