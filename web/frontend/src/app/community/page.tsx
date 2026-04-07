"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  Users,
  Loader2,
  Heart,
  Trash2,
  Crown,
  Shield,
  HelpCircle,
  Mail,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Reply,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  communityAPI,
  CommunityMessage,
  SupportTicket,
  TicketMessage,
} from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";

type Tab = "chat" | "contact" | "tickets";

export default function CommunityPage() {
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [onlineCount, setOnlineCount] = useState(1);
  const [replyTo, setReplyTo] = useState<CommunityMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Contact admin state
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSendingContact, setIsSendingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [ticketReply, setTicketReply] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const [messagesData, onlineData] = await Promise.all([
          communityAPI.getMessages(50),
          communityAPI.getOnlineCount(),
        ]);
        setMessages(messagesData.messages);
        setOnlineCount(onlineData.online_count);
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    loadMessages();

    // Refresh messages every 10 seconds
    const interval = setInterval(async () => {
      try {
        const messagesData = await communityAPI.getMessages(50);
        setMessages(messagesData.messages);
      } catch (error) {
        console.error("Error refreshing messages:", error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Load tickets when tab changes
  useEffect(() => {
    if (activeTab === "tickets") {
      loadTickets();
    }
  }, [activeTab]);

  const loadTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const data = await communityAPI.getMyTickets();
      setTickets(data.tickets);
    } catch (error) {
      console.error("Error loading tickets:", error);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const loadTicketMessages = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    try {
      const data = await communityAPI.getTicketMessages(ticket.id);
      setTicketMessages(data.messages);
    } catch (error) {
      console.error("Error loading ticket messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const result = await communityAPI.sendMessage(input, replyTo?.id);
      if (result.success && result.message) {
        setMessages((prev) => [...prev, result.message]);
        setInput("");
        setReplyTo(null);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      if (error.status === 429) {
        alert("Trop de messages. Veuillez patienter un moment.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeMessage = async (messageId: number) => {
    try {
      const result = await communityAPI.likeMessage(messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                likes: result.liked ? m.likes + 1 : m.likes - 1,
                user_liked: result.liked,
              }
            : m
        )
      );
    } catch (error) {
      console.error("Error liking message:", error);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm("Supprimer ce message ?")) return;
    try {
      await communityAPI.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleContactAdmin = async () => {
    if (!contactSubject.trim() || !contactMessage.trim() || isSendingContact)
      return;

    setIsSendingContact(true);
    try {
      await communityAPI.contactAdmin(contactSubject, contactMessage);
      setContactSuccess(true);
      setContactSubject("");
      setContactMessage("");
      setTimeout(() => setContactSuccess(false), 5000);
      // Reload tickets
      await loadTickets();
    } catch (error) {
      console.error("Error contacting admin:", error);
      alert("Erreur lors de l'envoi du message.");
    } finally {
      setIsSendingContact(false);
    }
  };

  const handleTicketReply = async () => {
    if (!ticketReply.trim() || !selectedTicket || isSendingReply) return;

    setIsSendingReply(true);
    try {
      await communityAPI.replyToTicket(selectedTicket.id, ticketReply);
      setTicketReply("");
      // Reload messages
      await loadTicketMessages(selectedTicket);
    } catch (error) {
      console.error("Error replying to ticket:", error);
    } finally {
      setIsSendingReply(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t("community_just_now");
    if (minutes < 60) return lang === "fr" ? `il y a ${minutes}min` : `${minutes}m ago`;
    if (hours < 24) return lang === "fr" ? `il y a ${hours}h` : `${hours}h ago`;
    if (days < 7) return lang === "fr" ? `il y a ${days}j` : `${days}d ago`;
    return date.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[calc(100vh-8rem)] flex flex-col"
    >
      {/* Header */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold">{t("community_title")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("community_subtitle")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-profit animate-pulse" />
            <span>{onlineCount} {t("community_online")}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab("chat")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
              activeTab === "chat"
                ? "bg-primary text-white"
                : "bg-white/5 hover:bg-white/10 text-muted-foreground"
            )}
          >
            <MessageCircle className="w-4 h-4" />
            {t("community_tab_chat")}
          </button>
          <button
            onClick={() => setActiveTab("contact")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
              activeTab === "contact"
                ? "bg-primary text-white"
                : "bg-white/5 hover:bg-white/10 text-muted-foreground"
            )}
          >
            <HelpCircle className="w-4 h-4" />
            {t("community_tab_contact")}
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
              activeTab === "tickets"
                ? "bg-primary text-white"
                : "bg-white/5 hover:bg-white/10 text-muted-foreground"
            )}
          >
            <Mail className="w-4 h-4" />
            {t("community_tab_tickets")}
            {tickets.filter((t) => t.status === "open").length > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">
                {tickets.filter((t) => t.status === "open").length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h2 className="text-lg font-semibold mb-2">
                  {t("community_empty_chat")}
                </h2>
                <p className="text-muted-foreground">
                  {t("community_be_first")}
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-3 rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
                        message.is_admin
                          ? "bg-gradient-to-br from-yellow-500 to-orange-500 text-white"
                          : message.is_premium
                          ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                          : "bg-white/10 text-muted-foreground"
                      )}
                    >
                      {message.username?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {message.username}
                        </span>
                        {message.is_admin && (
                          <span className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                        {message.is_premium && !message.is_admin && (
                          <span className="flex items-center gap-1 text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                            <Crown className="w-3 h-3" />
                            Premium
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                      <p className="text-sm mt-1 break-words">
                        {message.content}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => handleLikeMessage(message.id)}
                          className={cn(
                            "flex items-center gap-1 text-xs transition-colors",
                            message.user_liked
                              ? "text-pink-500"
                              : "text-muted-foreground hover:text-pink-500"
                          )}
                        >
                          <Heart
                            className={cn(
                              "w-4 h-4",
                              message.user_liked && "fill-current"
                            )}
                          />
                          {message.likes > 0 && message.likes}
                        </button>
                        <button
                          onClick={() => setReplyTo(message)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Reply className="w-4 h-4" />
                          {t("community_reply")}
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-loss transition-colors ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply indicator */}
          <AnimatePresence>
            {replyTo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-card p-3 mt-2 rounded-lg flex items-center gap-2"
              >
                <Reply className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground">
                    {t("community_reply_to")}{" "}
                  </span>
                  <span className="text-xs font-semibold">
                    {replyTo.username}
                  </span>
                  <p className="text-sm truncate">{replyTo.content}</p>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          <div className="mt-4 glass-card p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Votre message..."
                className="flex-1 input"
                maxLength={1000}
                disabled={isLoading}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="btn-primary px-6 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </motion.button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Respectez les autres membres de la communaute
            </p>
          </div>
        </>
      )}

      {/* Contact Admin Tab */}
      {activeTab === "contact" && (
        <div className="flex-1 overflow-y-auto">
          <div className="glass-card p-6 rounded-xl max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-primary" />
              Contacter l'Administration
            </h2>
            <p className="text-muted-foreground mb-6">
              Vous avez une question, un probleme ou une suggestion ?
              N'hesitez pas a nous contacter.
            </p>

            {contactSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-profit/20 border border-profit/30 text-profit rounded-lg p-4 mb-6 flex items-center gap-3"
              >
                <CheckCircle className="w-5 h-5" />
                <span>
                  Votre message a ete envoye. Un admin vous repondra bientot.
                </span>
              </motion.div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Sujet</label>
                <select
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Selectionnez un sujet...</option>
                  <option value="Bug / Probleme technique">
                    Bug / Probleme technique
                  </option>
                  <option value="Question generale">Question generale</option>
                  <option value="Demande Premium">Demande Premium</option>
                  <option value="Signalement">Signalement</option>
                  <option value="Suggestion">Suggestion</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Message
                </label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Decrivez votre demande en detail..."
                  rows={6}
                  className="input w-full resize-none"
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {contactMessage.length}/2000
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleContactAdmin}
                disabled={
                  !contactSubject.trim() ||
                  !contactMessage.trim() ||
                  isSendingContact
                }
                className="btn-primary w-full py-3 disabled:opacity-50"
              >
                {isSendingContact ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Envoyer le message
                  </span>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Tickets Tab */}
      {activeTab === "tickets" && (
        <div className="flex-1 overflow-y-auto">
          {selectedTicket ? (
            <div className="space-y-4">
              {/* Ticket header */}
              <div className="glass-card p-4 rounded-xl">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-sm text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Retour aux tickets
                </button>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{selectedTicket.subject}</h3>
                    <p className="text-sm text-muted-foreground">
                      Cree le{" "}
                      {new Date(selectedTicket.created_at).toLocaleDateString(
                        "fr-FR"
                      )}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-xs",
                      selectedTicket.status === "open"
                        ? "bg-profit/20 text-profit"
                        : "bg-white/10 text-muted-foreground"
                    )}
                  >
                    {selectedTicket.status === "open" ? "Ouvert" : "Ferme"}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3">
                {ticketMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "glass-card p-4 rounded-xl",
                      msg.is_admin && "border border-yellow-500/30"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {msg.is_admin ? (
                        <span className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                          <Shield className="w-3 h-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="text-sm font-semibold">
                          {msg.username}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </motion.div>
                ))}
              </div>

              {/* Reply form */}
              {selectedTicket.status === "open" && (
                <div className="glass-card p-4 rounded-xl">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={ticketReply}
                      onChange={(e) => setTicketReply(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleTicketReply()
                      }
                      placeholder="Votre reponse..."
                      className="flex-1 input"
                      disabled={isSendingReply}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleTicketReply}
                      disabled={!ticketReply.trim() || isSendingReply}
                      className="btn-primary px-6 disabled:opacity-50"
                    >
                      {isSendingReply ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {isLoadingTickets ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-xl">
                  <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h2 className="text-lg font-semibold mb-2">
                    Aucun ticket de support
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Vous n'avez pas encore contacte l'administration.
                  </p>
                  <button
                    onClick={() => setActiveTab("contact")}
                    className="btn-primary"
                  >
                    Creer un ticket
                  </button>
                </div>
              ) : (
                tickets.map((ticket) => (
                  <motion.button
                    key={ticket.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => loadTicketMessages(ticket)}
                    className="glass-card p-4 rounded-xl w-full text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">
                            {ticket.subject}
                          </h3>
                          {ticket.last_from_admin && (
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {ticket.last_message}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(ticket.updated_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {ticket.message_count} messages
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-xs flex items-center gap-1",
                            ticket.status === "open"
                              ? "bg-profit/20 text-profit"
                              : "bg-white/10 text-muted-foreground"
                          )}
                        >
                          {ticket.status === "open" ? (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              Ouvert
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Ferme
                            </>
                          )}
                        </span>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 text-center text-xs text-muted-foreground">
        Fait par CaptenQwark - CaptenTDB
      </div>
    </motion.div>
  );
}
