package com.fitme.notification;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.auth.service.AuthEmailService;
import com.fitme.community.entity.CommunityComment;
import com.fitme.community.entity.CommunityPost;
import com.fitme.community.repository.CommunityCommentRepository;
import com.fitme.community.repository.CommunityPostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import static com.fitme.notification.CustomerEmailService.escape;
import static com.fitme.notification.CustomerEmailService.layout;

/** Tells someone that their post or comment got a new reply. Best-effort: never throws. */
@Service
@RequiredArgsConstructor
@Slf4j
public class CommunityCommentEmailService {

    private final AuthEmailService mail;
    private final UserAccountRepository userAccountRepository;
    private final CommunityCommentRepository commentRepository;
    private final CommunityPostRepository postRepository;

    public void send(CommunityCommentEvent event) {
        try {
            CommunityComment comment = commentRepository.findById(event.commentId()).orElse(null);
            CommunityPost post = postRepository.findById(event.postId()).orElse(null);
            UserAccount recipient = userAccountRepository.findById(event.recipientId()).orElse(null);
            if (comment == null || post == null || recipient == null) {
                return;
            }
            UserAccount actor = userAccountRepository.findById(event.actorId()).orElse(null);
            String actorName = actor == null ? "Một thành viên" : displayName(actor);

            String heading = event.reply()
                    ? "Có người trả lời bình luận của bạn"
                    : "Có người bình luận bài đăng của bạn";
            String excerpt = excerpt(comment.getContent());
            String link = mail.frontendLink("/outfit/" + post.getShareCode());
            String greeting = displayName(recipient);

            String message = event.reply()
                    ? actorName + " đã trả lời bình luận của bạn trên bài đăng \"" + title(post) + "\":\n\n\"" + excerpt + "\""
                    : actorName + " đã bình luận về bài đăng \"" + title(post) + "\" của bạn:\n\n\"" + excerpt + "\"";

            String text = "FitMe AI — " + heading + "\n\n"
                    + "Xin chào " + greeting + ",\n\n"
                    + message + "\n\n"
                    + (link == null ? "" : "Xem bài đăng: " + link + "\n")
                    + "\nTrân trọng,\nĐội ngũ FitMe AI\n";
            String html = layout(heading,
                    "<p style=\"margin:0 0 12px;\">Xin chào " + escape(greeting) + ",</p>"
                            + "<p style=\"margin:0 0 12px;\">" + escape(message) + "</p>",
                    link, "Xem bài đăng");
            mail.sendNotification(recipient.getEmail(), "FitMe · " + heading, text, html, "community comment");
        } catch (RuntimeException ex) {
            log.warn("[MAIL] community comment email for {} skipped: {}", event.commentId(), ex.toString());
        }
    }

    private static String displayName(UserAccount user) {
        return user.getDisplayName() == null || user.getDisplayName().isBlank()
                ? "bạn"
                : user.getDisplayName();
    }

    private static String title(CommunityPost post) {
        if (post.getTitle() != null && !post.getTitle().isBlank()) {
            return post.getTitle();
        }
        return "outfit của bạn";
    }

    /** Keeps the mail short: the full comment stays in the app. */
    private static String excerpt(String content) {
        if (content == null) {
            return "";
        }
        String trimmed = content.trim();
        return trimmed.length() <= 160 ? trimmed : trimmed.substring(0, 160) + "…";
    }
}
