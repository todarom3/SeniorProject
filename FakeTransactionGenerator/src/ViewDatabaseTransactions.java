import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class ViewDatabaseTransactions {

    private static final String DB_URL = "jdbc:sqlite:transactions.db";

    public static void main(String[] args) {

        try (Connection conn = DriverManager.getConnection(DB_URL);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT * FROM transactions")) {

            System.out.println("---- ALL DATABASE TRANSACTIONS ----\n");

            while (rs.next()) {

                int transactionId = rs.getInt("transaction_id");
                String cardNumber = rs.getString("card_number");
                String timestamp = rs.getString("timestamp");
                String merchant = rs.getString("merchant");
                String location = rs.getString("location");
                double amount = rs.getDouble("amount");
                int fraudFlag = rs.getInt("is_potential_fraud");

                System.out.println(
                        "ID: " + transactionId +
                        " | Card: " + cardNumber +
                        " | Time: " + timestamp +
                        " | Merchant: " + merchant +
                        " | Location: " + location +
                        " | Amount: $" + String.format("%.2f", amount) +
                        " | FraudFlag: " + fraudFlag
                );
            }

            System.out.println("\n---- END OF DATA ----");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
