"use client";
import React, { useState, useEffect } from "react";
import {
  ALL_PLAYERS,
  GAME_EXIT_ENUM,
  GAME_STATE_ENUM,
  LEADER_BOARD,
  PLAYER_ID_KEY,
  PLAYER_NAME,
  RESULT_ENUM,
  Routes,
} from "@/lib/constants";

import { useRouter } from "next/navigation";
import { gameEngine } from "../gameplay/lib/gameEngine";
import useLocalStorage from "./useLocalStorage";
import useSessionStorage from "./useSessionStorage";

const useGamePlay = () => {
  const [playerMove, setPlayerMove] = useState({ ready: true });
  const [opponentMove, setOpponentMove] = useState({ ready: true });
  const [openResultModal, setOpenResultModal] = useState(false);
  const [openGameResultModal, setOpenGameResultModal] = useState(false);
  const [allPlayers, setAllPlayers] = useLocalStorage(ALL_PLAYERS, {});
  const [leaderBoard, setLeaderBoard] = useLocalStorage(LEADER_BOARD, {});
  const [playerId] = useSessionStorage(PLAYER_ID_KEY, null);
  const [playerName] = useSessionStorage(PLAYER_NAME, null);
  const route = useRouter();

  useEffect(() => {
    channel.onmessage = (ev) => {
      switch (ev?.data?.context) {
        case "MOVE":
          if (ev.data?.opponentId === playerId) {
            setOpponentMove({
              id: ev.data?.id,
              move: ev.data?.move,
              ready: false,
            });
          }
          break;
        case "READY":
          if (ev.data?.opponentId === playerId) {
            setPlayerMove((playerMove) => ({ ...playerMove, ready: true }));
          }
          break;
      }
    };
  });

  const player = allPlayers?.[playerId];
  const opponent = allPlayers?.[player?.opponentId];

  const channel = new BroadcastChannel(`game_started`);

  const handleClearAllPlayersMove = () => {
    setAllPlayers(allPlayers);
    setPlayerMove((player) => ({ ...player, move: null }));
    setOpponentMove((opponent) => ({ ...opponent, move: null }));
    setOpenResultModal(null);
    channel.postMessage({
      playerId: playerId,
      opponentId: opponent.id,
      context: "READY",
    });
  };

  const handelMoveSelection = (selectedMove) => {
    setPlayerMove({
      id: playerId,
      move: selectedMove,
      ready: false,
    });
    channel.postMessage({
      playerId: playerId,
      opponentId: opponent.id,
      move: selectedMove,
      context: "MOVE",
    });
  };

  const handlePlayAgain = () => {
    player.score = 0;
    opponent.score = 0;
    setAllPlayers(allPlayers);
    setPlayerMove((player) => ({ ...player, move: null }));
    setOpponentMove((opponent) => ({ ...opponent, move: null }));
    setOpenGameResultModal(null);
  };

  const handleGameReset = ({ context }) => {
    if (!player) {
      route.push(Routes.HOME);
      return;
    }
    player.score = 0;
    player.opponentId = null;
    player.game_state = GAME_STATE_ENUM.NOT_STARTED;
    if (context !== GAME_EXIT_ENUM.CONNECTION_LOST) {
      opponent.score = 0;
      opponent.opponentId = null;
      opponent.game_state = GAME_STATE_ENUM.NOT_STARTED;
    }
    setAllPlayers(allPlayers);
    route.push(Routes.LOBBY);
  };

  if (playerMove.move && opponentMove.move && !openResultModal) {
    const result = gameEngine(playerMove, opponentMove);
    if (result === RESULT_ENUM.PLAYER_WINS) {
      player.score = (player?.score || 0) + 1;
    }
    if (result === RESULT_ENUM.OPPONENT_WINS) {
      opponent.score = (opponent?.score || 0) + 1;
    }
    setOpenResultModal(result);
  }

  if (player?.score >= 5 && !openGameResultModal) {
    handleClearAllPlayersMove();
    player.points = (player?.points || 0) + 3;
    setLeaderBoard(allPlayers);
    setOpenGameResultModal({ won: player });
  }

  if (opponent?.score >= 5 && !openGameResultModal) {
    handleClearAllPlayersMove();
    opponent.points = (opponent?.points || 0) + 3;
    setLeaderBoard(allPlayers);
    setOpenGameResultModal({ won: opponent });
  }

  return {
    playerId,
    playerName,
    player,
    opponent,
    playerMove,
    opponentMove,
    openGameResultModal,
    openResultModal,
    onGameReset: handleGameReset,
    onMoveSelect: handelMoveSelection,
    onClearAllPlayersMove: handleClearAllPlayersMove,
    onPlayAgain: handlePlayAgain,
  };
};

export default useGamePlay;
