export default class AppConfig {

    getConfig() {
        return {
            'wssPort': 7000,
            'wssChatPath': '/chat',
            'wssSystemPath': '/system',

            'restApiPort': 5000,

            'postgresPath': 'hattie.db.elephantsql.com',
            'postgresPort': 5432,
            'postgresDB': 'rgdmakbz',
            'postgresUser': 'rgdmakbz',
            'postgresPass': 'lwtIpnIPhhTIgw7Wrc9ZAIjPepmt1okU'

            // extra DB
            // 'postgresPath': 'dpg-cfeeu7pmbjsqnjmc0md0-a.frankfurt-postgres.render.com',
            // 'postgresPort': 5432,
            // 'postgresDB': 'chat_ij6p',
            // 'postgresUser': 'chat_ij6p_user',
            // 'postgresPass': 'jxPs3ErrF5SVSaA8bAi88SgxWIbgKbD6'
        }
    }
}