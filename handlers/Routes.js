export default class Routes {
  async getUsersHandler(req, res, db) {
    if (req && req.headers && req.headers.authorization) {
      const user = await db.getUserByToken(
        req.headers.authorization.replace("Bearer ", "")
      );
      if (user && user.id) {
        res.status(200).send(db.getUsers());
      } else {
        res.status(401).send("Bad token");
      }
    } else {
      res.status(400).send("Bad request data");
    }
  }

  async getAuthHandler(req, res, db) {
    if (req && req.headers && req.headers.authorization) {
      const user = await db.getUserByToken(
        req.headers.authorization.replace("Bearer ", "")
      );
      if (user && user.id) {
        res.status(200).send(db.getUsers().filter((e) => e.id === user.id));
      } else {
        res.status(401).send("Bad token");
      }
    } else {
      res.status(400).send("Bad request data");
    }
  }

  async putUsersHandler(req, res, db, wss) {
    if (
      req &&
      req.headers &&
      req.headers.authorization &&
      (req.body.image || req.body.pass)
    ) {
      const user = await db.getUserByToken(
        req.headers.authorization.replace("Bearer ", "")
      );
      if (user && user.id) {
        const userRes = await db.updateUser(
          user.id,
          req.body.pass || "",
          req.body.image || ""
        );
        if (userRes && userRes.id) {
          if (req.body.image !== "") {
            const data = {
              msg: "userChangeImage",
              user: {
                id: userRes.id,
                login: userRes.login,
                email: userRes.email,
                created: userRes.created,
                channels: userRes.channels,
                image: userRes.image,
                isOnline: userRes.isOnline,
              },
              type: "system",
            };
            wss.wssSend(JSON.stringify(data), "system");
          }
          res.status(200).send(userRes);
        } else {
          res.status(500).send("Can not update user " + user.id);
        }
      } else {
        res.status(401).send("Bad token");
      }
    } else {
      res.status(400).send("Bad request data");
    }
  }

  async getChannelsHandler(req, res, db) {
    if (req && req.headers && req.headers.authorization) {
      const user = await db.getUserByToken(
        req.headers.authorization.replace("Bearer ", "")
      );
      if (user && user.id) {
        res.status(200).send(db.getChannels());
      } else {
        res.status(401).send("Bad token");
      }
    } else {
      res.status(400).send("Bad request data");
    }
  }

  async getMessagesHandler(req, res, db) {
    if (req && req.headers && req.headers.authorization) {
      const user = await db.getUserByToken(
        req.headers.authorization.replace("Bearer ", "")
      );
      if (user && user.id) {
        const arrIds =
          req && req.query && req.query.id ? req.query.id.split(",") : [];
        res.status(200).send(db.getMessages(arrIds));
      } else {
        res.status(401).send("Bad token");
      }
    } else {
      res.status(400).send("Bad request data");
    }
  }

  async postLoginHandler(req, res, db) {
    if (req && req.body && req.body.login && req.body.pass) {
      const user = await db.getUserByLoginPass(req.body.login, req.body.pass);
      if (user && user.id) {
        const token = await db.newToken(user.id);
        if (token) {
          user.token = token;
          user.isOnline = false;
          delete user.password;
          res.status(200).send(user);
        } else {
          res.status(500).send("Can not set token for user " + user.id);
        }
      } else {
        res.status(401).send("Bad credentials");
      }
    } else {
      res.status(400).send("Bad request data");
    }
  }

  async postLogOutHandler(req, res, db, wss) {
    if (req && req.headers && req.headers.authorization) {
      const token = req.headers.authorization.replace("Bearer ", "");
      const user = await db.getUserByToken(token);
      if (user && user.id) {
        for (const [key, value] of Object.entries(wss.usersOnline)) {
          if (value === user.id) {
            wss.usersOnline[key] = -1;
            wss.wssSend(
              JSON.stringify({
                msg: "IamOffline",
                type: "system",
                sender: user.id,
              }),
              "system"
            );
            break;
          }
        }

        for (let i = 0; i < db.userList.length; i++) {
          if (db.userList[i].id === user.id) db.userList[i].isOnline = false;
        }
        await db.newToken(user.id);
        res.status(200).send("ok");
      } else {
        res.status(401).send("user not found");
      }
    } else {
      res.status(400).send("Bad request data");
    }
  }

  async postRegistrationHandler(req, res, db, wss) {
    if (req && req.body && req.body.login && req.body.pass && req.body.email) {
      const user = await db.getUserByLoginOrEmail(
        req.body.login,
        req.body.email
      );
      if (user && user.id) {
        res.status(403).send("user with this login or email already exists");
      } else {
        let createUserResult;
        if (req.body.image) {
          createUserResult = await db.createUser(
            req.body.login,
            req.body.pass,
            req.body.email,
            req.body.image
          );
        } else {
          createUserResult = await db.createUser(
            req.body.login,
            req.body.pass,
            req.body.email
          );
        }
        if (createUserResult && createUserResult.rowCount) {
          const user = await db.getUserByLoginPass(
            req.body.login,
            req.body.pass
          );
          if (user && user.id) {
            const token = await db.newToken(user.id, true);
            if (token) {
              db.userList.push({
                id: user.id,
                login: user.login,
                email: user.email,
                created: user.created,
                channels: [],
                image: user.image,
                isOnline: false,
              });
              user.token = token;
              user.isOnline = false;
              delete user.password;
              const data = {
                msg: "newUserRegistered",
                user: {
                  id: user.id,
                  login: user.login,
                  email: user.email,
                  created: user.created,
                  channels: [],
                  image: user.image,
                  isOnline: false,
                },
                type: "system",
              };
              wss.wssSend(JSON.stringify(data), "system");
              res.status(200).send(user);
            } else {
              res.status(500).send("Can not set token for user " + user.id);
            }
          } else {
            res.status(401).send("user not found");
          }
        } else {
          res.status(500).send("Can not create user " + req.body.login);
        }
      }
    } else {
      res.status(400).send("Bad request data");
    }
  }

  async postChannelHandler(req, res, db, wss) {
    if (req && req.body && req.body.name && req.body.description) {
      if (req.headers && req.headers.authorization) {
        const user = await db.getUserByToken(
          req.headers.authorization.replace("Bearer ", "")
        );
        if (user && user.id) {
          const chan = await db.createChannel(
            user.id,
            req.body.name,
            req.body.description
          );
          if (chan === -1) {
            res.status(400).send("Channel already exists " + req.body.name);
          } else if (chan === 0) {
            res
              .status(504)
              .send("Server error. Can not create channel " + req.body.name);
          } else if (chan && chan.id) {
            const data = {
              msg: "newChannelCreated",
              channel: chan,
              type: "system",
            };
            wss.wssSend(JSON.stringify(data), "system");
            res.status(200).send(chan);
          } else {
            res
              .status(500)
              .send("Server error. Can not create channel " + req.body.name);
          }
        } else {
          res.status(401).send("Bad token");
        }
      } else {
        res.status(400).send("Bad request data");
      }
    } else {
      res.status(400).send("Bad request data");
    }
  }

  async putChannelHandler(req, res, db, wss) {
    if (req && req.body && (req.body.name || req.body.description)) {
      if (req.headers && req.headers.authorization) {
        const user = await db.getUserByToken(
          req.headers.authorization.replace("Bearer ", "")
        );
        if (user && user.id) {
          const chan = await db.getChannelById(req.params.id);
          if (chan && chan.id > 0) {
            if (chan.owner_user_id === user.id) {
              const result = await db.updateChannel(
                chan.id,
                req.body.name || "",
                req.body.description || ""
              );
              if (result === -1) {
                res.status(400).send("Channel already exists " + req.body.name);
              } else if (result && result.id) {
                const data = {
                  msg: "channelUpdated",
                  channel: result,
                  type: "system",
                };
                wss.wssSend(JSON.stringify(data), "system");
                res.status(200).send(result);
              } else {
                res.status(500).send("Server error");
              }
            } else {
              res.status(403).send("You are not owner");
            }
          } else {
            res.status(400).send("Channel " + req.params.id + " not found");
          }
        } else {
          res.status(401).send("Bad token");
        }
      } else {
        res.status(400).send("Bad request data");
      }
    } else {
      res.status(400).send("Bad request data");
    }
  }

  async deleteChannelHandler(req, res, db, wss) {
    if (req.headers && req.headers.authorization) {
      const user = await db.getUserByToken(
        req.headers.authorization.replace("Bearer ", "")
      );
      if (user && user.id) {
        const chan = await db.getChannelById(req.params.id);
        if (chan && chan.id > 0) {
          if (chan.owner_user_id === user.id) {
            await db.deleteChannel(chan.id);
            const data = {
              msg: "channelDeleted",
              channel: chan,
              type: "system",
            };
            wss.wssSend(JSON.stringify(data), "system");
            res.status(200).send("ok");
          } else {
            res.status(403).send("You are not owner");
          }
        } else {
          res.status(400).send("Channel " + req.params.id + " not found");
        }
      } else {
        res.status(401).send("Bad token");
      }
    } else {
      res.status(400).send("Bad request data");
    }
  }

  async postChannelSubscribeHandler(req, res, db, wss) {
    if (req.headers && req.headers.authorization) {
      const user = await db.getUserByToken(
        req.headers.authorization.replace("Bearer ", "")
      );
      if (user && user.id) {
        const chan = await db.getChannelById(req.params.id);
        if (chan && chan.id > 0) {
          const userRes = await db.subscribeToChannel(user.id, chan.id);

          if (userRes && userRes.id) {
            const data = {
              msg: "subscribeToChannel",
              user: userRes,
              channel: chan,
              type: "system",
            };
            wss.wssSend(JSON.stringify(data), "system");
            res.status(200).send("ok");
          } else {
            res.status(500).send("Can not define user " + user.id);
          }
        } else {
          res.status(400).send("Channel " + req.params.id + " not found");
        }
      } else {
        res.status(401).send("Bad token");
      }
    } else {
      res.status(400).send("Bad request data");
    }
  }

  async postChannelUnsubscribeHandler(req, res, db, wss) {
    if (req.headers && req.headers.authorization) {
      const user = await db.getUserByToken(
        req.headers.authorization.replace("Bearer ", "")
      );
      if (user && user.id) {
        const chan = await db.getChannelById(req.params.id);
        if (chan && chan.id > 0) {
          const userRes = await db.unsubscribeFromChannel(user.id, chan.id);
          if (userRes && userRes.id) {
            const data = {
              msg: "unsubscribeFromChannel",
              user: userRes,
              channel: chan,
              type: "system",
            };
            wss.wssSend(JSON.stringify(data), "system");
            res.status(200).send("ok");
          } else {
            res.status(500).send("Can not define user " + user.id);
          }
        } else {
          res.status(400).send("Channel " + req.params.id + " not found");
        }
      } else {
        res.status(401).send("Bad token");
      }
    } else {
      res.status(400).send("Bad request data");
    }
  }
}
