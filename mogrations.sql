DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
	id serial PRIMARY KEY,
	login VARCHAR ( 50 ) UNIQUE NOT NULL,
	password VARCHAR ( 50 ) NOT NULL,
	email VARCHAR ( 255 ) UNIQUE NOT NULL,
	created TIMESTAMP NOT NULL DEFAULT NOW(),
    role VARCHAR (10) default 'user'
);

DROP TABLE IF EXISTS tokens CASCADE;
CREATE TABLE tokens (
    id serial PRIMARY KEY,
    token VARCHAR ( 255 ) UNIQUE NOT NULL,
    user_id INT NOT null,
    CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id)
);

DROP TABLE IF EXISTS channels CASCADE;
CREATE TABLE channels (
	id serial PRIMARY KEY,
	name VARCHAR ( 50 ) NOT NULL,
    description VARCHAR ( 255 )
);

DROP TABLE IF EXISTS channelUsers CASCADE;
CREATE TABLE channelUsers (
	id serial PRIMARY KEY,
	user_id INT NOT NULL,
    channel_id INT NOT NULL,
    CONSTRAINT fk_user_chan FOREIGN KEY(user_id) REFERENCES users(id),
    CONSTRAINT fk_chan_cjan FOREIGN KEY(channel_id) REFERENCES channels(id)
);

DROP TABLE IF EXISTS messages CASCADE;
CREATE TABLE messages (
	id serial PRIMARY KEY,
	user_id INT NOT NULL,
    channel_id INT NOT NULL,
    msg TEXT,
    created TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user_msg FOREIGN KEY(user_id) REFERENCES users(id),
    CONSTRAINT fk_chan_msg FOREIGN KEY(channel_id) REFERENCES channels(id)
);

CREATE UNIQUE INDEX channelusers_user_id_idx ON public.channelusers (user_id,channel_id);