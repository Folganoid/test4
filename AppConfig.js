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
        }
    }
}